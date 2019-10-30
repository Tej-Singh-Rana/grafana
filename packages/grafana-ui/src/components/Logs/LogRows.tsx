import React, { PureComponent } from 'react';
import memoizeOne from 'memoize-one';
import { LogsModel, TimeZone, LogsDedupStrategy, LogRowModel } from '@grafana/data';

import { Themeable } from '../../types/theme';
import { withTheme } from '../../themes/index';
import { getLogRowStyles } from './getLogRowStyles';

//Components
import { LogRow } from './LogRow';

const PREVIEW_LIMIT = 100;
const RENDER_LIMIT = 500;

export interface Props extends Themeable {
  data: LogsModel;
  dedupStrategy: LogsDedupStrategy;
  highlighterExpressions: string[];
  showTime: boolean;
  timeZone: TimeZone;
  deduplicatedData?: LogsModel;
  rowLimit?: number;
  isLogsPanel?: boolean;
  onClickFilterLabel?: (key: string, value: string) => void;
  onClickFilterOutLabel?: (key: string, value: string) => void;
  getRowContext?: (row: LogRowModel, options?: any) => Promise<any>;
}

interface State {
  deferLogs: boolean;
  renderAll: boolean;
}

class UnThemedLogRows extends PureComponent<Props, State> {
  deferLogsTimer: number | null = null;
  renderAllTimer: number | null = null;

  state: State = {
    deferLogs: true,
    renderAll: false,
  };

  componentDidMount() {
    // Staged rendering
    if (this.state.deferLogs) {
      const { data } = this.props;
      const rowCount = data && data.rows ? data.rows.length : 0;
      // Render all right away if not too far over the limit
      const renderAll = rowCount <= PREVIEW_LIMIT * 2;
      this.deferLogsTimer = window.setTimeout(() => this.setState({ deferLogs: false, renderAll }), rowCount);
    }
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    // Staged rendering
    if (prevState.deferLogs && !this.state.deferLogs && !this.state.renderAll) {
      this.renderAllTimer = window.setTimeout(() => this.setState({ renderAll: true }), 2000);
    }
  }

  componentWillUnmount() {
    if (this.deferLogsTimer) {
      clearTimeout(this.deferLogsTimer);
    }

    if (this.renderAllTimer) {
      clearTimeout(this.renderAllTimer);
    }
  }

  makeGetRows = memoizeOne((processedRows: LogRowModel[]) => {
    return () => processedRows;
  });

  render() {
    const {
      dedupStrategy,
      showTime,
      data,
      deduplicatedData,
      highlighterExpressions,
      timeZone,
      onClickFilterLabel,
      onClickFilterOutLabel,
      rowLimit,
      theme,
      isLogsPanel,
    } = this.props;
    const { deferLogs, renderAll } = this.state;
    const dedupedData = deduplicatedData ? deduplicatedData : data;
    const hasData = data && data.rows && data.rows.length > 0;
    const dedupCount = dedupedData
      ? dedupedData.rows.reduce((sum, row) => (row.duplicates ? sum + row.duplicates : sum), 0)
      : 0;
    const showDuplicates = dedupStrategy !== LogsDedupStrategy.none && dedupCount > 0;

    // Staged rendering
    const processedRows = dedupedData ? dedupedData.rows : [];
    const firstRows = processedRows.slice(0, PREVIEW_LIMIT);
    const renderLimit = rowLimit || RENDER_LIMIT;
    const rowCount = Math.min(processedRows.length, renderLimit);
    const lastRows = processedRows.slice(PREVIEW_LIMIT, rowCount);

    // React profiler becomes unusable if we pass all rows to all rows and their labels, using getter instead
    const getRows = this.makeGetRows(processedRows);
    const getRowContext = this.props.getRowContext ? this.props.getRowContext : () => Promise.resolve([]);
    const { logsRows } = getLogRowStyles(theme);

    return (
      <div className={logsRows}>
        {hasData &&
        !deferLogs && // Only inject highlighterExpression in the first set for performance reasons
          firstRows.map((row, index) => (
            <LogRow
              key={row.uid}
              getRows={getRows}
              getRowContext={getRowContext}
              highlighterExpressions={highlighterExpressions}
              row={row}
              showDuplicates={showDuplicates}
              showTime={showTime}
              timeZone={timeZone}
              isLogsPanel={isLogsPanel}
              onClickFilterLabel={onClickFilterLabel}
              onClickFilterOutLabel={onClickFilterOutLabel}
            />
          ))}
        {hasData &&
          !deferLogs &&
          renderAll &&
          lastRows.map((row, index) => (
            <LogRow
              key={row.uid}
              getRows={getRows}
              getRowContext={getRowContext}
              row={row}
              showDuplicates={showDuplicates}
              showTime={showTime}
              timeZone={timeZone}
              isLogsPanel={isLogsPanel}
              onClickFilterLabel={onClickFilterLabel}
              onClickFilterOutLabel={onClickFilterOutLabel}
            />
          ))}
        {hasData && deferLogs && <span>Rendering {rowCount} rows...</span>}
      </div>
    );
  }
}

export const LogRows = withTheme(UnThemedLogRows);
LogRows.displayName = 'LogsRows';

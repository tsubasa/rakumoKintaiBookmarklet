import { RakumoKintaiApp, RakumoKintaiCalculator } from './classes';

// types
type RakumoKintaiAppConfig = {
  settings: {
    account: {
      userId: string;
    };
    attendance: {
      defaultPeriodId: number;
    };
  };
};

interface MyWindow extends Window {
  appConfig: RakumoKintaiAppConfig;
}

declare const window: MyWindow;

// utilities
const getPeriodId = (): number | undefined => {
  const match = window.location.pathname.match(/\/attendance\/reports\/(\d+).*/);
  return match ? parseInt(match[1], 10) : undefined;
};

const appendItem = (name: string, value: string | number, columnIndex = 1): void => {
  const column = document.querySelector(`.report-summary .column:nth-child(${columnIndex})`);

  const e = document.createElement('div');
  e.className = `item item-${columnIndex}`;
  e.innerHTML = `<div class="name">${name}</div><div class="value">${value}</div>`;

  if (column) {
    const currentItem = column.querySelector(`.item-${columnIndex}`);
    if (currentItem && column.lastChild) column.removeChild(column.lastChild);
    column.appendChild(e);
  }
};

const formattedTime = (minutes: number): string => {
  const isMinus = minutes < 0;
  if (isMinus) minutes *= -1; // eslint-disable-line no-param-reassign
  return `${isMinus ? '-' : ''}${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
};

// main
const run = async (): Promise<void> => {
  const { settings } = window.appConfig;
  const app = new RakumoKintaiApp(settings.account.userId, settings.attendance.defaultPeriodId);

  let periodId = getPeriodId();
  if (!periodId) {
    const report = await app.getLatestReport();
    if (report) {
      periodId = report.periodId;
    }
  }

  if (periodId) {
    const records = await app.getRecords(periodId);
    const calc = new RakumoKintaiCalculator(records.items);
    const date = new Date();
    appendItem(
      `現在までの時間外労働時間 (集計時間 ${String(date.getHours()).padStart(2, '0')}:${String(
        date.getMinutes()
      ).padStart(2, '0')})`,
      formattedTime(calc.overtimeWorkingMinutes)
    );
  }
};

run();

['.btn-checkOut', '.update-button-wrapper'].forEach(v => document.querySelector(v)?.addEventListener('click', run));

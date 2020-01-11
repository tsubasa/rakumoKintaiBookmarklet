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

interface Window {
  appConfig: RakumoKintaiAppConfig;
}

type AttendanceReport = {
  periodId: number;
};

type AttendanceRecord = {
  workingMinutesWithBreaks: number; // 実働時間+休憩時間
  breakMinutes: number; // 休憩時間
  actualWorkingMinutes: number; // 実働時間
  workingDay?: {
    workingMinutes: number; // 1日に必要な労働時間
  };
  leaves?: { minutes: number; unit: 'full-day' | 'half-day' }[]; // 休暇取得関連
  checkInStamp: {} | null; // 出勤が打刻されると反映
  checkOutStamp: {} | null; // 退勤が打刻されると反映
};

type AttendanceReports = { items: AttendanceReport[] };

type AttendanceRecords = { items: AttendanceRecord[] };

type AttendanceReportsRequestParams = { periodId: string; userKey: string };

type AttendanceRecordsRequestParams = { periodId: string };

// Utilities
const getPeriodId = (): number | undefined => {
  const match = window.location.pathname.match(/\/attendance\/reports\/(\d+).*/);
  return match ? parseInt(match[1], 10) : undefined;
};

const appendItem = (name: string, value: string | number): void => {
  const e = document.createElement('div');
  e.className = 'item';
  e.innerHTML = `<div class="name">${name}</div><div class="value">${value}</div>`;
  const column = document.querySelector(`.report-summary .column:nth-child(1)`);
  if (column) column.appendChild(e);
};

const formattedTime = (minutes: number): string =>
  `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;

// classes
class RakumoKintaiApp {
  private readonly userId: string;

  private readonly defaultPeriodId: number;

  private readonly BASE_API_URL = 'https://a-rakumo.appspot.com/api/attendance/v1';

  public constructor(userId: string, defaultPeriodId: number) {
    this.userId = userId;
    this.defaultPeriodId = defaultPeriodId;
  }

  public async getReports(): Promise<AttendanceReports> {
    return this.req<AttendanceReports, AttendanceReportsRequestParams>('reports', {
      periodId: `${this.defaultPeriodId}`,
      userKey: this.userId
    });
  }

  public async getLatestReport(): Promise<AttendanceReport | undefined> {
    const reports = await this.getReports();
    return reports.items.shift();
  }

  public async getRecords(periodId: number): Promise<AttendanceRecords> {
    return this.req<AttendanceRecords, AttendanceRecordsRequestParams>(`records/${this.userId}`, {
      periodId: `${periodId}`
    });
  }

  private async req<T, P extends { [key: string]: string }>(path: string, params?: P): Promise<T> {
    return fetch(`${this.BASE_API_URL}/${path}?${new URLSearchParams(params)}`).then(res => res.json());
  }
}

// main
(async (): Promise<void> => {
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

    let workingMinutes = 0; // 所定労働時間
    let actualWorkingMinutes = 0; // 実労働時間
    let notWorkingMinutes = 0; // 休暇取得時間
    let overtimeWorkingMinutes = 0;

    records.items.forEach(v => {
      if (
        v.workingDay &&
        ((v.checkInStamp && v.checkOutStamp) ||
          (!v.checkInStamp && !v.checkOutStamp && v.leaves && v.leaves.find(leave => leave.unit === 'full-day')))
      ) {
        workingMinutes += v.workingDay.workingMinutes;
        actualWorkingMinutes += v.actualWorkingMinutes;
        notWorkingMinutes += v.leaves ? v.leaves.reduce((acc, cur) => acc + cur.minutes, 0) : 0;
      }
    });

    overtimeWorkingMinutes = actualWorkingMinutes - workingMinutes + notWorkingMinutes;
    if (overtimeWorkingMinutes < 0) overtimeWorkingMinutes = 0;

    // console.log('所定労働時間', workingMinutes);
    // console.log('実労働時間', actualWorkingMinutes);
    // console.log('時間外労働時間', overtimeWorkingMinutes);

    appendItem('本日までの時間外労働時間', formattedTime(overtimeWorkingMinutes));
  }
})();

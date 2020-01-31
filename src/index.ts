/* eslint-disable max-classes-per-file, class-methods-use-this */

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

type LeaveUnit = 'full-day' | 'half-day';

type LeaveUnitType = 'am' | 'pm';

type RecordFlow = { params: { leaveUnitType: LeaveUnitType; leaveUnit: LeaveUnit } };

type AttendanceReport = {
  periodId: number;
};

type AttendanceRecord = {
  date: string; // 日付
  actualWorkingMinutes: number; // 実働時間
  checkInLateMinutes: number; // 遅刻時間
  workingDay?: {
    workingMinutes: number; // 1日に必要な労働時間
    breaks: { startTime: string; endTime: string }[]; // 1日の休憩時間
  };
  flows: RecordFlow[];
  checkInStamp: { roundedDatetime: string } | null; // 出勤が打刻されると反映
  checkOutStamp: {} | null; // 退勤が打刻されると反映
};

type AttendanceReports = { items: AttendanceReport[] };

type AttendanceRecords = { items: AttendanceRecord[] };

type AttendanceReportsRequestParams = { periodId: string; userKey: string };

type AttendanceRecordsRequestParams = { periodId: string };

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

class RakumoKintaiCalculator {
  private workingMinutes = 0;

  private actualWorkingMinutes = 0;

  private notWorkingMinutes = 0;

  private todayCheckInLateMinutes = 0;

  private readonly AM_OFF = 210;

  private readonly PM_OFF = 270;

  public constructor(records: AttendanceRecord[]) {
    records.forEach(v => this.calc(v));
  }

  private calc(record: AttendanceRecord): void {
    // 出勤日
    if (record.workingDay) {
      // 過去から当日までのデータを集計
      if (!this.isAfterDate(record.date)) {
        // 出退勤が打刻済み
        if (record.checkInStamp && record.checkOutStamp) {
          this.workingMinutes += record.workingDay.workingMinutes;
          this.actualWorkingMinutes += record.actualWorkingMinutes;
          this.notWorkingMinutes += this.calcNotWorkingMinutes(record.flows);
        }
        // 出勤のみが打刻済み(当日のデータ)
        else if (this.isEqualDate(record.date) && record.checkInStamp && !record.checkOutStamp) {
          const breakMinutes = record.workingDay.breaks.reduce(
            (acc, cur) => acc + this.calcDiffMinutes(cur.endTime, cur.startTime),
            0
          );
          const actualWorkingMinutes =
            this.calcDiffMinutes(new Date().toISOString(), record.checkInStamp.roundedDatetime) - breakMinutes;

          this.workingMinutes += record.workingDay.workingMinutes;
          this.actualWorkingMinutes += actualWorkingMinutes < 0 ? 0 : actualWorkingMinutes;
          this.notWorkingMinutes += this.calcNotWorkingMinutes(record.flows);

          // 当日のペナルティを保持する(日別集計前のため)
          this.todayCheckInLateMinutes += record.checkInLateMinutes;
        }
      }
    }
  }

  private calcNotWorkingMinutes(flows: RecordFlow[]): number {
    return flows.reduce((acc, cur) => {
      const { leaveUnit, leaveUnitType } = cur.params;

      if (leaveUnit === 'full-day') {
        return acc + this.AM_OFF + this.PM_OFF;
      }

      if (leaveUnit === 'half-day') {
        if (leaveUnitType === 'am') return acc + this.AM_OFF;
        if (leaveUnitType === 'pm') return acc + this.PM_OFF;
      }

      return acc;
    }, 0);
  }

  private calcDiffMinutes(date1: string, date2: string): number {
    const diffTime = new Date(date1).getTime() - new Date(date2).getTime();
    return diffTime !== 0 ? Math.round(diffTime / 1000 / 60) : 0;
  }

  private isAfterDate(date: string): boolean {
    return new Date(this.getTodayDate()).getTime() < new Date(date).getTime();
  }

  private isEqualDate(date: string): boolean {
    return new Date(this.getTodayDate()).getTime() === new Date(date).getTime();
  }

  private getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  public get overtimeWorkingMinutes(): number {
    const overtimeWorkingMinutes =
      this.actualWorkingMinutes - this.workingMinutes + this.todayCheckInLateMinutes + this.notWorkingMinutes;
    return overtimeWorkingMinutes < 0 ? 0 : overtimeWorkingMinutes;
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
    const calc = new RakumoKintaiCalculator(records.items);

    appendItem('現在までの時間外労働時間', formattedTime(calc.overtimeWorkingMinutes));
  }
})();

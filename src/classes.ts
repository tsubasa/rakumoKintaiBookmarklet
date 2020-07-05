/* eslint-disable max-classes-per-file, class-methods-use-this */

type LeaveUnit = 'full-day' | 'half-day';

type LeaveUnitType = null | 'am' | 'pm';

type RecordFlow = { params: { leaveUnitType: LeaveUnitType; leaveUnit: LeaveUnit } };

type AttendanceReport = {
  periodId: number;
};

type AttendanceRecord = {
  date: string; // 日付
  actualWorkingMinutes: number; // 実働時間
  // checkInLateMinutes: number; // 遅刻によるペナルティ時間
  // checkOutEarlyMinutes: number; // 早退によるペナルティ時間
  checkInStamp: { roundedDatetime: string } | null; // 出勤が打刻されると反映
  checkOutStamp: { roundedDatetime: string } | null; // 退勤が打刻されると反映
  flows: RecordFlow[]; // 申請手続き
  // breaks: { startTime: string; endTime: string }[]; // 実際の休憩時間
  workingDay?: {
    workingMinutes: number; // 1日に必要な労働時間
    breaks: { startTime: string; endTime: string }[]; // 1日の休憩時間
  };
};

export type TestAttendanceRecord = AttendanceRecord; // for testing only

type AttendanceReports = { items: AttendanceReport[] };

type AttendanceRecords = { items: AttendanceRecord[] };

type AttendanceReportsRequestParams = { periodId: string; userKey: string };

type AttendanceRecordsRequestParams = { periodId: string };

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
    return fetch(`${this.BASE_API_URL}/${path}?${new URLSearchParams(params)}`).then((res) => res.json());
  }
}

class RakumoKintaiCalculator {
  private workingMinutes = 0;

  private actualWorkingMinutes = 0;

  private notWorkingMinutes = 0;

  private readonly AM_OFF = 210;

  private readonly PM_OFF = 270;

  private readonly breakStartTime = `${this.getTodayDate()}T04:00:00Z`;

  public constructor(records: AttendanceRecord[]) {
    records.forEach((v) => this.calc(v));
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
          const checkInTime = record.checkInStamp.roundedDatetime;
          let dayOffAmBreakMinutes = 0;

          const breakMinutes = record.workingDay.breaks.reduce(
            (acc, cur) => acc + this.calcDiffMinutes(cur.endTime, cur.startTime),
            0
          );

          if (record.flows.find((v) => v.params.leaveUnit === 'half-day' && v.params.leaveUnitType === 'am')) {
            dayOffAmBreakMinutes = this.calcDiffMinutes(checkInTime, this.breakStartTime);
          }

          const actualWorkingMinutes =
            this.calcDiffMinutes(new Date().toISOString(), checkInTime) - breakMinutes + dayOffAmBreakMinutes;

          this.workingMinutes += record.workingDay.workingMinutes;
          this.actualWorkingMinutes += actualWorkingMinutes < 0 ? 0 : actualWorkingMinutes; // TODO: 実働時間が休憩時間を下回ってた場合の対応
          this.notWorkingMinutes += this.calcNotWorkingMinutes(record.flows);
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
    return this.actualWorkingMinutes - this.workingMinutes + this.notWorkingMinutes;
  }
}

export { RakumoKintaiApp, RakumoKintaiCalculator };

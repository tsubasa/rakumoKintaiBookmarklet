import _ from 'lodash';

import { RakumoKintaiCalculator, TestAttendanceRecord } from './classes';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : DeepPartial<T[P]>;
};

const todayISOString = new Date().toISOString();

const todayDate = todayISOString.split('T')[0];

const toISOStringMock = jest.fn();

jest.spyOn(global.Date.prototype, 'toISOString').mockImplementation(toISOStringMock);

const createRecord = (record: DeepPartial<TestAttendanceRecord> = {}, date = '2020-01-01'): TestAttendanceRecord[] => [
  _.merge(
    {
      date,
      checkInStamp: {
        roundedDatetime: `${date}T02:00:00Z`
      },
      checkOutStamp: {},
      actualWorkingMinutes: 480,
      flows: [],
      workingDay: {
        workingMinutes: 480,
        breaks: [
          {
            endTime: `${date}T05:00:00Z`,
            startTime: `${date}T04:00:00Z`
          }
        ]
      }
    } as TestAttendanceRecord,
    record
  )
];

const testCaseIsNormal = createRecord();

const testCaseIsOvertimeWork = createRecord({ actualWorkingMinutes: 540 });

const testCaseIsWorkingOnToday = createRecord(
  {
    checkOutStamp: null,
    actualWorkingMinutes: 0
  },
  todayDate
);

const testCaseIsWorkingDayOffOnToday = createRecord(
  {
    checkInStamp: null,
    checkOutStamp: null,
    actualWorkingMinutes: 0,
    flows: [
      {
        params: {
          leaveUnitType: null,
          leaveUnit: 'full-day'
        }
      }
    ]
  },
  todayDate
);

const testCaseIsWorkingDayOffAmOnToday = createRecord(
  {
    checkInStamp: {
      roundedDatetime: `${todayDate}T05:00:00Z`
    },
    checkOutStamp: null,
    actualWorkingMinutes: 0,
    flows: [
      {
        params: {
          leaveUnitType: 'am',
          leaveUnit: 'half-day'
        }
      }
    ]
  },
  todayDate
);

describe('RakumoKintaiCalculator', () => {
  beforeEach(() => {
    toISOStringMock.mockReset();
  });

  describe('overtimeWorkingMinutes', () => {
    it('isNormal', () => {
      toISOStringMock.mockReturnValue(todayISOString);
      const calc = new RakumoKintaiCalculator(testCaseIsNormal);
      expect(calc.overtimeWorkingMinutes).toBe(0);
    });

    it('isOvertimeWork', () => {
      toISOStringMock.mockReturnValue(todayISOString);
      const calc = new RakumoKintaiCalculator(testCaseIsOvertimeWork);
      expect(calc.overtimeWorkingMinutes).toBe(60);
    });

    it('isWorkingOnToday', () => {
      toISOStringMock.mockReturnValue(`${todayDate}T11:00:00Z`);
      const calc = new RakumoKintaiCalculator(testCaseIsWorkingOnToday);
      expect(calc.overtimeWorkingMinutes).toBe(0);
    });

    it('isOvertimeWorkingOnToday', () => {
      toISOStringMock.mockReturnValue(`${todayDate}T12:00:00Z`);
      const calc = new RakumoKintaiCalculator(testCaseIsWorkingOnToday);
      expect(calc.overtimeWorkingMinutes).toBe(60);
    });

    it('isNotEnoughWorkingMinutesOnToday', () => {
      toISOStringMock.mockReturnValue(`${todayDate}T10:00:00Z`);
      const calc = new RakumoKintaiCalculator(testCaseIsWorkingOnToday);
      expect(calc.overtimeWorkingMinutes).toBe(-60);
    });

    it('isWorkingDayOffOnToday', () => {
      toISOStringMock.mockReturnValue(todayISOString);
      const calc = new RakumoKintaiCalculator(testCaseIsWorkingDayOffOnToday);
      expect(calc.overtimeWorkingMinutes).toBe(0);
    });

    it('isWorkingDayOffAmOnToday', () => {
      toISOStringMock.mockReturnValue(`${todayDate}T09:30:00Z`);
      const calc = new RakumoKintaiCalculator(testCaseIsWorkingDayOffAmOnToday);
      expect(calc.overtimeWorkingMinutes).toBe(0);
    });
  });

  // TODO: 午後休を想定するテストを追加
});

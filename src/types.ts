import { OptionValues } from 'commander';
import * as fs from 'fs';
import path from 'path';

// Extend the Date prototype with a new function
declare global {
    interface Date {
        toISOLocaleString(): string;
    }

    interface Number {
        leftPad(size: number): string;
    }
}

Date.prototype.toISOLocaleString = function () {
    const myself = this as Date;

    const offset = myself.getTimezoneOffset();
    const offsetString = (offset < 0 ? '+' : '-') + Math.floor(Math.abs(offset / 60)).leftPad(2) + ':' + Math.abs(offset % 60).leftPad(2);

    return (
        myself.getFullYear().toString() +
        '-' +
        (myself.getMonth() + 1).leftPad(2) +
        '-' +
        myself.getDate().leftPad(2) +
        'T' +
        myself.getHours().leftPad(2) +
        ':' +
        myself.getMinutes().leftPad(2) +
        ':' +
        myself.getSeconds().leftPad(2) +
        '.' +
        myself.getMilliseconds().leftPad(3) +
        offsetString
    );
};

Number.prototype.leftPad = function (size: number) {
    let s = String(this);
    while (s.length < (size || 2)) {
        s = '0' + s;
    }
    return s;
};

// Define the types for the data structure
export interface RecordData {
    sgNumber: string;
    chineseName: string;
}

export interface ConfigData {
    eventId: string;
}

export interface NonValunteerDataRow {
    engName: string;
    chineseName: string;
    phone: string;
    gender: string;
    identification: string;
}

interface VmsInputParam {
    debug: boolean;
    runAutomation: boolean;
    fileName?: string;

    volunteerType: string;
    actionType: string;
}

export class VmsParams {
    private _isDebug: boolean;
    private _volunteerType: string;
    private _actionType: string;

    private _runAutomation: boolean;
    private _fileName: string;

    constructor(globalOptionValues: OptionValues, CommondOptionValues: OptionValues) {
        const options = { ...globalOptionValues, ...CommondOptionValues } as VmsInputParam;

        this._isDebug = options.debug;
        this._runAutomation = options.runAutomation;

        this._fileName = options.fileName ?? '';

        this._volunteerType = ['volunteer', 'vol'].includes(options.volunteerType.toLowerCase()) ? 'volunteer' : 'non-volunteer';
        this._actionType = ['registration', 'reg'].includes(options.actionType.toLowerCase()) ? 'registration' : 'attendance';
    }

    get isDebug() {
        return this._isDebug;
    }

    get runAutomation() {
        return this._runAutomation;
    }

    get fileName() {
        return this._fileName;
    }

    get isVolunteer() {
        return this._volunteerType === 'volunteer';
    }
    get isNonVolunteer() {
        return this._volunteerType === 'non-volunteer';
    }

    get VOLUNTEER_TYPE() {
        return this._volunteerType;
    }

    get isRegistration() {
        return this._actionType === 'registration';
    }
    get isAttendance() {
        return this._actionType === 'attendance';
    }

    get ACTION_TYPE() {
        return this._actionType;
    }
}

export interface DmsConfigData {
    sgNumber: string;
    subName: string;
    subEmail: string;
}

interface DmsInputParam {
    debug: boolean;
    runAutomation: boolean;
    fileName?: string;

    screenshot: boolean;
}

export class DmsParams {
    private _isDebug: boolean;
    private _runAutomation: boolean;

    private _screenshot: boolean;
    private _fileName: string;

    constructor(globalOptionValues: OptionValues, CommondOptionValues: OptionValues) {
        const options = { ...globalOptionValues, ...CommondOptionValues } as DmsInputParam;

        this._isDebug = options.debug;
        this._runAutomation = options.runAutomation;

        this._screenshot = options.screenshot;
        this._fileName = options.fileName ?? '';
    }

    get isDebug() {
        return this._isDebug;
    }

    get runAutomation() {
        return this._runAutomation;
    }

    get captureScreenshot() {
        return this._screenshot;
    }
    get fileName() {
        return this._fileName;
    }
}

// Define the types for the data structure
export interface DonationDataRow {
    fullName: string;
    chineseName: string;
    phoneNo: string;
    amount: number;
    gender: string;
}

export class CustomLogger {
    private logName: string;
    // private logRoot: string;
    private logDevice: fs.WriteStream;

    private logsFolderPath: string;
    private screenshotPath: string;

    constructor(private logRoot: string) {
        const logsRootPath = path.resolve(logRoot);

        const currentDatetime = new Date().toISOLocaleString();
        const isoDate = currentDatetime.split('T')[0]; // Extract the date part from the ISO format

        // this.logName = currentDatetime.split('+')[0].replaceAll(':', '-'); // Extract the date part from the ISO format

        this.logsFolderPath = `${logsRootPath}/${isoDate}`;
        this.screenshotPath = `${logsRootPath}/${isoDate}/screenshot`;

        this.logName = `${this.logsFolderPath}/${currentDatetime.split('+')[0].replaceAll(':', '-')}.log`;

        // create logsRoot if not exists
        if (!fs.existsSync(logsRootPath)) {
            fs.mkdirSync(logsRootPath);
        }

        if (!fs.existsSync(this.logsFolderPath)) {
            fs.mkdirSync(this.logsFolderPath);
            // if (isDebug) console.log(`Folder '${this.logsFolderPath}' created.`);
        }

        if (!fs.existsSync(this.screenshotPath)) {
            fs.mkdirSync(this.screenshotPath);
            // if (isDebug) console.log(`Folder '${this.screenshotPath}' created.`);
        }

        // this.logName = logName;
        // this.logRoot = logRoot;
        // this.logDevice = fs.createWriteStream(`${this.logsFolderPath}/${this.logName}.log`, { flags: 'a' });
        this.logDevice = fs.createWriteStream(this.logName, { flags: 'a' });
    }

    get name() {
        return this.logName;
    }
    get logFolder() {
        return this.logRoot;
    }
    get screenshotFolder() {
        return this.screenshotPath;
    }

    log(message: string | object, ...args: string[]): void {
        this.console(message, ...args);
        this.logFile(message, ...args);
    }

    logFile(message: string | object, ...args: string[]): void {
        // Custom implementation of the new function
        let formatedMessage = `${new Date().toISOLocaleString()} ${typeof message === 'string' ? message : JSON.stringify(message, null, 4)}`;

        args.forEach((msg) => {
            formatedMessage += ` ${msg}`;
        });
        formatedMessage += '\n';

        this.logDevice.write(formatedMessage);
    }

    console(message: string | object, ...args: string[]): void {
        console.log(message, ...args);
    }
}

export interface DmsErrorData {
    type: 'data' | 'config';
    rowNumber: number;
    data: DonationDataRow | DmsConfigData;
    message: string[];
}

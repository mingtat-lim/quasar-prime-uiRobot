import { config } from '@dotenvx/dotenvx';
import { DmsParams, VmsParams } from './types.js';

// load the .env environment variables
config();

export class VmsConfig {
    private _USERID: string;
    private _PASSWD: string;

    private _defaultFileName: string;

    private _PARAMS: VmsParams;

    constructor(params: VmsParams) {
        this._PARAMS = params;

        this._USERID = params.isRegistration ? process.env.REG_USERID ?? '' : process.env.ATT_USERID ?? '';
        this._PASSWD = params.isRegistration ? process.env.REG_PASSWD ?? '' : process.env.ATT_PASSWD ?? '';

        this._defaultFileName = process.env.DEFAULT_FILE_NAME_VMS ?? '';

        if (this.params.isDebug) {
            console.log(this.userId, this.password);
        }
    }

    get userId() {
        return this._USERID;
    }

    get password() {
        return this._PASSWD;
    }

    get defaultFileName() {
        return this._defaultFileName;
    }

    get params() {
        return this._PARAMS;
    }

    private get baseUrl() {
        return process.env.BASE_URL_VMS ?? '';
    }

    get loginUrl() {
        return `${this.baseUrl}/users/sign_in`;
    }

    get dataFileName() {
        // return './data/automation-master-data.xlsx';
        return this._PARAMS.fileName === ''
            ? this._PARAMS.isVolunteer ? this.defaultFileName.replace('{type}', 'volunteer') : this.defaultFileName.replace('{type}', 'public')
            : this._PARAMS.fileName;
    }
    get worksheetName() {
        // return this.params.isVolunteer ? 'sgRegister' : 'non-vol';
        return this.params.isVolunteer ? 'data' : 'data';
    }

    getUrlVolRegSearchBySgNumber(eventId: string, sgNumber: string) {
        return `${this.baseUrl}/activity/registrations/new?id=${eventId}&volunteer_id=${sgNumber}`;
    }

    getUrlVolRegSearchByPhone(eventId: string, phoneNumber: string) {
        return `${this.baseUrl}/activity/registrations/new?id=${eventId}&contact_number=${phoneNumber}`;
    }

    getUrlVolAttByEvent(eventId: string) {
        return `${this.baseUrl}/admin/attendance/events/${eventId}/attendances/list`;
    }

    getUrlVolAttByPhone(eventId: string, phoneNumber: string) {
        return `${this.baseUrl}/admin/attendance/events/${eventId}/attendances/new?&event_id=${eventId}&contact_number=${phoneNumber}`;
    }

    getUrlNonVolReg(eventId: string) {
        return `${this.baseUrl}/activity/public_registrations/new?id=${eventId}`;
    }

    getUrlNonVolAtt(eventId: string) {
        return `${this.baseUrl}/admin/attendance/events/${eventId}/public_attendances/new`;
    }
}


export class DmsConfig {
    private _PARAMS: DmsParams;

    private _defaultFileName: string;

    constructor(params: DmsParams) {
        this._PARAMS = params;

        this._defaultFileName = process.env.DEFAULT_FILE_NAME_DMS ?? '';

        if (this.isDebug) {
            // console.log(this.isDebug, this.runAutomation);
        }
    }

    get isDebug() {
        return this._PARAMS.isDebug;
    }

    get runAutomation() {
        return this._PARAMS.runAutomation;
    }

    get defaultFileName() {
        return this._defaultFileName;
    }

    get captureScreenshot() {
        return this._PARAMS.captureScreenshot;
    }

    get fileName() {
        return this._PARAMS.fileName === '' ? this.defaultFileName : this._PARAMS.fileName;
    }

    private get baseUrl() {
        return process.env.BASE_URL_DMS ?? '';
    }

    get dmsPortalUrl() {
        return `${this.baseUrl}/Donation/DonateNow`;
    }
}

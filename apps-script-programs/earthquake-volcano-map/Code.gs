/**
 * 지진·화산 좌표 사냥 지도
 * Google Apps Script + Google Sheets
 *
 * Index.html과 함께 사용하세요.
 * 기본 비밀번호는 1234입니다.
 */

const SHEET_NAME = 'points';
const RESET_PASSWORD = '1234';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('지진대 화산대')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['timestamp', 'group', 'type', 'name', 'lat', 'lng']);
    sheet.setFrozenRows(1);
  }

  const headers = sheet.getRange(1, 1, 1, 6).getValues()[0];
  const expected = ['timestamp', 'group', 'type', 'name', 'lat', 'lng'];
  const ok = expected.every((h, i) => headers[i] === h);

  if (!ok) {
    sheet.clear();
    sheet.appendRow(expected);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function submitPoint(data) {
  const group = String(data.group || '공통').trim() || '공통';
  const type = String(data.type || '').trim();
  const name = String(data.name || '').trim();
  const lat = Number(data.lat);
  const lng = Number(data.lng);

  if (type !== '화산' && type !== '지진') throw new Error('종류는 화산 또는 지진이어야 합니다.');
  if (!name) throw new Error('이름 또는 지역을 입력하세요.');
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error('위도는 -90부터 90 사이여야 합니다.');
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error('경도는 -180부터 180 사이여야 합니다.');

  const sheet = getSheet_();
  sheet.appendRow([new Date(), group, type, name, lat, lng]);
  SpreadsheetApp.flush();

  return getPoints();
}

function getPoints() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return [];

  const rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

  return rows
    .map((row, i) => ({
      id: i + 2,
      timestamp: row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
      group: String(row[1] || ''),
      type: String(row[2] || ''),
      name: String(row[3] || ''),
      lat: Number(row[4]),
      lng: Number(row[5])
    }))
    .filter(p =>
      (p.type === '화산' || p.type === '지진') &&
      p.name &&
      Number.isFinite(p.lat) &&
      Number.isFinite(p.lng)
    );
}

function deletePoint(id) {
  const row = Number(id);
  if (!Number.isInteger(row) || row < 2) throw new Error('삭제할 점 정보가 올바르지 않습니다.');

  const sheet = getSheet_();
  if (row > sheet.getLastRow()) throw new Error('이미 삭제되었거나 존재하지 않는 점입니다.');

  sheet.deleteRow(row);
  SpreadsheetApp.flush();

  return getPoints();
}

function checkTeacherPassword(password) {
  if (String(password || '') !== RESET_PASSWORD) {
    throw new Error('교사용 비밀번호가 올바르지 않습니다.');
  }
  return { ok: true };
}

function clearAllPoints(password) {
  if (String(password || '') !== RESET_PASSWORD) {
    throw new Error('초기화 비밀번호가 올바르지 않습니다.');
  }

  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }

  SpreadsheetApp.flush();
  return getPoints();
}

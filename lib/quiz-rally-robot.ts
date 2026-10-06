import { QuizError } from './quiz-rally-errors';

const limits={head:12,chest:8,belly:8,back:8,headColor:6,chestColor:6,bellyColor:6,backColor:6} as const;
export type RobotParts=Record<keyof typeof limits,number>;
export function robotFor(value:unknown,avatar=0):RobotParts {
  const color=Number.isInteger(avatar)&&avatar>=0&&avatar<6?avatar:0;
  const result:RobotParts={head:color,chest:0,belly:0,back:0,headColor:color,chestColor:color,bellyColor:color,backColor:color};
  if(value&&typeof value==='object'&&!Array.isArray(value))for(const key of Object.keys(limits) as (keyof RobotParts)[]){
    const part=(value as Record<string,unknown>)[key];
    if(typeof part==='number'&&Number.isInteger(part)&&part>=0&&part<limits[key])result[key]=part;
  }
  return result;
}
export function validateRobot(value:unknown):RobotParts {
  if(!value||typeof value!=='object'||Array.isArray(value))throw new QuizError('로봇 부품을 다시 선택해 주세요.');
  const parts=value as Record<string,unknown>,keys=Object.keys(limits) as (keyof RobotParts)[];
  if(Object.keys(parts).length!==keys.length||keys.some(key=>typeof parts[key]!=='number'||!Number.isInteger(parts[key])||Number(parts[key])<0||Number(parts[key])>=limits[key]))throw new QuizError('로봇 부품을 다시 선택해 주세요.');
  return robotFor(parts);
}

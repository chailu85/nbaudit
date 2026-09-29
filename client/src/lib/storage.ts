import { Answers } from './scoring';
import { Profile } from '@/data/criteria';
const KEY = 'neibao-audit-v1';
export type AuditState = { profile: Profile; answers: Answers; savedAt: string };
export const saveAudit = (state: AuditState) => localStorage.setItem(KEY, JSON.stringify(state));
export const loadAudit = (): AuditState | null => { try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } };
export const clearAudit = () => localStorage.removeItem(KEY);
export const downloadJson = (state: AuditState) => { const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${state.profile.name || '单位'}-内保审核.json`; a.click(); URL.revokeObjectURL(a.href); };
export const readJsonFile = (file: File) => new Promise<AuditState>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => { try { resolve(JSON.parse(String(reader.result))); } catch { reject(new Error('JSON文件格式无效')); } }; reader.onerror = () => reject(new Error('读取文件失败')); reader.readAsText(file); });

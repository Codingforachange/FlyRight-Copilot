import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Checklist, ChecklistItem } from '../models/checklist.model';

@Injectable({
  providedIn: 'root'
})
export class ChecklistService {
  private readonly apiUrl = '/api/checklists';

  constructor(private http: HttpClient) { }

  getChecklistsByModel(modelCode: string): Observable<Checklist[]> {
    return this.http.get<Checklist[]>(`${this.apiUrl}/${modelCode}`);
  }
  toggleItemStatus(itemId: number): Observable<ChecklistItem> {
    return this.http.patch<ChecklistItem>(`${this.apiUrl}/items/${itemId}`, {});
  }
  resetChecklist(modelCode: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/reset/${modelCode}`, {});
  }
}

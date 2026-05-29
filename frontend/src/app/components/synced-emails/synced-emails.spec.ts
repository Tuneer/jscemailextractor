import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SyncedEmails } from './synced-emails';

describe('SyncedEmails', () => {
  let component: SyncedEmails;
  let fixture: ComponentFixture<SyncedEmails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SyncedEmails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SyncedEmails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

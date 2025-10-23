import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NotesService, NoteInput, Priority } from '../services/notes.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, catchError, map } from 'rxjs/operators';
import { interval, of, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-note',
  templateUrl: './note.page.html',
  styleUrls: ['note.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
})
export class NotePage implements OnInit {
  id?: string;
  priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];
  backendNotReady = false;
  graphqlUrl = environment.graphqlUrl;
  lastErrorMessage?: string;
  private pingSub?: Subscription;

  form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    content: ['', [Validators.required]],
    priority: ['MEDIUM' as Priority, [Validators.required]],
  });

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private notesSvc: NotesService,
    private toastCtrl: ToastController
  ) {}

  private destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') ?? undefined;

    if (this.id) {
      this.notesSvc
        .getNote(this.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (n) => {
            if (n) {
              this.form.setValue({
                title: n.title,
                content: n.content,
                priority: n.priority,
              });
            }
            this.backendNotReady = false;
            this.lastErrorMessage = undefined;
            this.stopHealthPing();
          },
          error: (err) => {
            console.error('getNote error', err);
            this.backendNotReady = true;
            this.lastErrorMessage = err?.message ?? 'Unknown error';
            this.startHealthPing();
          },
        });
    }
  }

  save() {
    console.log('NotePage.save() clicked', {
      valid: this.form.valid,
      value: this.form.getRawValue(),
    });
    if (this.form.invalid) return;

    const input: NoteInput = this.form.getRawValue();
    const done = () => this.router.navigateByUrl('/home');

    if (this.id) {
      this.notesSvc
        .updateNote(this.id, input)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.backendNotReady = false;
            this.lastErrorMessage = undefined;
            this.stopHealthPing();
            done();
          },
          error: (err) => {
            console.error('updateNote error', err);
            this.backendNotReady = true;
            this.lastErrorMessage = err?.message ?? 'Unknown error';
            this.presentErrorToast(
              'Unable to update note. Backend is not ready.'
            );
            this.startHealthPing();
          },
        });
    } else {
      this.notesSvc
        .createNote(input)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.backendNotReady = false;
            this.lastErrorMessage = undefined;
            this.stopHealthPing();
            this.router.navigate(['/home'], {
              queryParams: { resetFilter: '1' },
            });
          },
          error: (err) => {
            console.error('createNote error', err);
            this.backendNotReady = true;
            this.lastErrorMessage = err?.message ?? 'Unknown error';
            this.presentErrorToast(
              'Unable to create note. Backend is not ready.'
            );
            this.startHealthPing();
          },
        });
    }
  }

  cancel() {
    this.router.navigateByUrl('/home');
  }

  private async presentErrorToast(message: string) {
    const t = await this.toastCtrl.create({
      message,
      color: 'warning',
      duration: 4000,
      position: 'top',
      buttons: [{ text: 'Dismiss', role: 'cancel' }],
    });
    await t.present();
  }

  openStatusPopover(ev: Event, popover: any) {
    if (popover?.present) {
      popover.present({ event: ev });
    }
  }

  private startHealthPing() {
    if (this.pingSub) return;
    this.pingSub = interval(3000)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap(() =>
          this.notesSvc.ping().pipe(
            map(() => true),
            catchError((err) => {
              this.lastErrorMessage = err?.message ?? 'Unknown error';
              return of(false);
            })
          )
        )
      )
      .subscribe((ok) => {
        if (ok) {
          this.backendNotReady = false;
          this.lastErrorMessage = undefined;
          this.stopHealthPing();
        }
      });
  }

  private stopHealthPing() {
    if (this.pingSub) {
      this.pingSub.unsubscribe();
      this.pingSub = undefined;
    }
  }
}

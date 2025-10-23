import {
  Component,
  OnDestroy,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { NotesService, Note, Priority } from '../services/notes.service';
import { take, switchMap, catchError, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../environments/environment';
import { interval, of, Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnDestroy {
  notes: Note[] = [];
  counts?: Record<Priority, number>;
  backendNotReady = false;
  graphqlUrl = environment.graphqlUrl;
  lastErrorMessage?: string;
  isStatusOpen = false;

  private selectedPrioritySig = signal<Priority | 'ALL'>('ALL');
  private pingSub?: Subscription;
  private destroyRef = inject(DestroyRef);

  // Expose signal value to template via accessor for [(ngModel)] compatibility
  get selectedPriority(): Priority | 'ALL' {
    return this.selectedPrioritySig();
  }
  set selectedPriority(val: Priority | 'ALL') {
    this.selectedPrioritySig.set(val);
  }

  // Derived filter value for API
  get priority(): Priority | undefined {
    const v = this.selectedPrioritySig();
    return v && v !== 'ALL' ? (v as Priority) : undefined;
  }

  constructor(
    private notesSvc: NotesService,
    private router: Router,
    private route: ActivatedRoute,
    private alertCtrl: AlertController
  ) {}

  ionViewWillEnter() {
    const reset = this.route.snapshot.queryParamMap.get('resetFilter');
    if (reset) {
      this.selectedPriority = 'ALL';

      // clear the query param so it doesn't keep resetting on navigation
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { resetFilter: null },
        queryParamsHandling: 'merge',
      });
    }
    this.load();
  }

  load() {
    this.notesSvc
      .watchNotes(this.priority)
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ data }) => {
          const items = (data?.notes as Note[]) ?? [];
          this.notes = items
            .slice()
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            );

          this.backendNotReady = false;
          this.lastErrorMessage = undefined;
          this.stopHealthPing();
          this.loadCounts();
        },
        error: (err) => {
          this.backendNotReady = true;
          this.lastErrorMessage = err?.message ?? 'Unknown error';
          this.startHealthPing();
        },
      });
  }

  private loadCounts() {
    this.notesSvc
      .countByPriority()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => (this.counts = c),
        error: () => {},
      });
  }

  getCount(p: Priority | 'ALL'): number {
    if (!this.counts) return 0;

    if (p === 'ALL')
      return (
        (this.counts.LOW ?? 0) +
        (this.counts.MEDIUM ?? 0) +
        (this.counts.HIGH ?? 0)
      );

    return this.counts[p] ?? 0;
  }

  optionLabel(p: Priority | 'ALL'): string {
    const base = p === 'ALL' ? 'All' : p.charAt(0) + p.slice(1).toLowerCase();
    const n = this.getCount(p);
    return n > 0 ? `${base} (${n})` : base;
  }

  onPriorityChange(ev: CustomEvent) {
    const val = ev.detail?.value as Priority | 'ALL';
    this.selectedPriority = val ?? 'ALL';
    this.load();
  }

  setPriority(p: Priority | 'ALL') {
    if (p !== this.selectedPriority) {
      this.selectedPriority = p;
      this.load();
    }
  }

  onSegmentChange(ev: CustomEvent) {
    const val = (ev.detail as any)?.value as Priority | 'ALL';
    this.setPriority(val ?? 'ALL');
  }

  createNote() {
    this.router.navigate(['/note/new']);
  }

  editNote(note: Note) {
    this.router.navigate(['/note', note.id]);
  }

  deleteNote(note: Note) {
    this.notesSvc
      .deleteNote(note.id)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.load(),
        error: (err) => console.error('deleteNote error', err),
      });
  }

  async confirmDelete(note: Note) {
    const title =
      (note && typeof note.title === 'string' ? note.title.trim() : '') ||
      undefined;

    const messageText = title
      ? `Do you like to delete note "${title}"?`
      : 'Do you like to delete this note?';

    const alert = await this.alertCtrl.create({
      header: 'Delete Note',
      message: messageText,
      cssClass: 'delete-alert',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'alert-cancel-btn',
        },
        {
          text: 'OK',
          role: 'confirm',
          cssClass: 'alert-ok-btn',
          handler: () => this.deleteNote(note),
        },
      ],
      backdropDismiss: true,
    });
    await alert.present();
  }

  openStatusPopover(ev: Event, popover: any) {
    // Position popover anchored to the click event (under the warning icon)
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
          // refresh list on recovery
          this.load();
          this.loadCounts();
        }
      });
  }

  private stopHealthPing() {
    if (this.pingSub) {
      this.pingSub.unsubscribe();
      this.pingSub = undefined;
    }
  }

  ngOnDestroy(): void {
    this.stopHealthPing();
  }
}

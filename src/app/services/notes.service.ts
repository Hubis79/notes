import { Injectable } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Note {
  id: string;
  title: string;
  content: string;
  priority: Priority;
  created_at: string;
  updated_at: string;
}

export interface NoteInput {
  title: string;
  content: string;
  priority: Priority;
}

const NOTES_QUERY = gql`
  query Notes($priority: Priority) {
    notes(priority: $priority) {
      id
      title
      content
      priority
      created_at
      updated_at
    }
  }
`;

// Minimal payload for counting
const NOTES_IDS_QUERY = gql`
  query NotesIds($priority: Priority) {
    notes(priority: $priority) {
      id
    }
  }
`;

const CREATE_NOTE_MUTATION = gql`
  mutation CreateNote($input: NoteInput!) {
    createNote(input: $input) {
      id
      title
      content
      priority
      created_at
      updated_at
    }
  }
`;

const UPDATE_NOTE_MUTATION = gql`
  mutation UpdateNote($id: ID!, $input: NoteInput!) {
    updateNote(id: $id, input: $input) {
      id
      title
      content
      priority
      created_at
      updated_at
    }
  }
`;

const DELETE_NOTE_MUTATION = gql`
  mutation DeleteNote($id: ID!) {
    deleteNote(id: $id) {
      id
    }
  }
`;

const NOTE_QUERY = gql`
  query Note($id: ID!) {
    note(id: $id) {
      id
      title
      content
      priority
      created_at
      updated_at
    }
  }
`;

@Injectable({ providedIn: 'root' })
export class NotesService {
  constructor(private apollo: Apollo) {}

  watchNotes(priority?: Priority) {
    const options: any = {
      query: NOTES_QUERY,
      fetchPolicy: 'network-only',
      nextFetchPolicy: 'cache-first',
    };

    if (priority) {
      options.variables = { priority };
    }

    return this.apollo.watchQuery<{ notes: Note[] }>(options);
  }

  createNote(input: NoteInput): Observable<Note> {
    return this.apollo
      .mutate<{ createNote: Note }>({
        mutation: CREATE_NOTE_MUTATION,
        variables: { input },
        refetchQueries: ['Notes'],
      })
      .pipe(map((r) => r.data!.createNote));
  }

  updateNote(id: string, input: NoteInput): Observable<Note> {
    return this.apollo
      .mutate<{ updateNote: Note }>({
        mutation: UPDATE_NOTE_MUTATION,
        variables: { id, input },
        refetchQueries: ['Notes'],
      })
      .pipe(map((r) => r.data!.updateNote));
  }

  getNote(id: string): Observable<Note> {
    return this.apollo
      .query<{ note: Note }>({
        query: NOTE_QUERY,
        variables: { id },
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => r.data!.note));
  }

  deleteNote(id: string): Observable<Note | null> {
    return this.apollo
      .mutate<{ deleteNote: Note | null }>({
        mutation: DELETE_NOTE_MUTATION,
        variables: { id },
        refetchQueries: ['Notes'],
      })
      .pipe(map((r) => r.data!.deleteNote ?? null));
  }

  // Lightweight health ping: queries __typename to verify backend reachability
  ping(): Observable<string> {
    return this.apollo
      .query<{ __typename: string }>({
        query: gql`
          query Ping {
            __typename
          }
        `,
        fetchPolicy: 'network-only',
      })
      .pipe(map((r) => r.data!.__typename));
  }

  // Count notes by priority via minimal IDs query
  countByPriority(): Observable<Record<Priority, number>> {
    const priorities: Priority[] = ['LOW', 'MEDIUM', 'HIGH'];
    const requests = priorities.map((p) =>
      this.apollo
        .query<{ notes: Array<{ id: string }> }>({
          query: NOTES_IDS_QUERY,
          variables: { priority: p },
          fetchPolicy: 'network-only',
        })
        .pipe(map((r) => r.data!.notes.length))
    );

    return forkJoin(requests).pipe(
      map(
        ([low, medium, high]) =>
          ({ LOW: low, MEDIUM: medium, HIGH: high } as Record<Priority, number>)
      )
    );
  }
}

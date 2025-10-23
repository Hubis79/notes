import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache, ApolloClientOptions, ApolloLink } from '@apollo/client/core';
import { onError } from '@apollo/client/link/error';
import { provideApollo } from 'apollo-angular';
import { inject } from '@angular/core';
import { environment } from '../environments/environment';

export function apolloOptionsFactory(httpLink: HttpLink): ApolloClientOptions {
  const http = httpLink.create({ uri: environment.graphqlUrl });

  const errorLink = onError((e: any) => {
    const { graphQLErrors, networkError, operation } = e || {};
    if (graphQLErrors) {
      for (const err of graphQLErrors) {
        // eslint-disable-next-line no-console
        console.error('[GraphQL error]', {
          op: operation?.operationName,
          message: err?.message,
          path: err?.path,
          extensions: err?.extensions,
        });
      }
    }
    if (networkError) {
      // eslint-disable-next-line no-console
      console.error('[Network error]', networkError);
    }
  });

  return {
    link: ApolloLink.from([errorLink, http]),
    cache: new InMemoryCache(),
  };
}

@NgModule({
  imports: [HttpClientModule],
  providers: [
    provideApollo(() => {
      const http = inject(HttpLink).create({ uri: environment.graphqlUrl });
      const errorLink = onError((e: any) => {
        const { graphQLErrors, networkError, operation } = e || {};
        if (graphQLErrors) {
          for (const err of graphQLErrors) {
            // eslint-disable-next-line no-console
            console.error('[GraphQL error]', {
              op: operation?.operationName,
              message: err?.message,
              path: err?.path,
              extensions: err?.extensions,
            });
          }
        }
        if (networkError) {
          // eslint-disable-next-line no-console
          console.error('[Network error]', networkError);
        }
      });
      return {
        link: ApolloLink.from([errorLink, http]),
        cache: new InMemoryCache(),
      };
    }),
  ],
})
export class GraphQLModule {}

import { Injectable } from '@angular/core';
import {environment} from '../environments/environment';
import {
  AuthorizationServiceConfigurationJson,
  AuthorizationServiceConfiguration,
  AuthorizationRequest,
  RedirectRequestHandler,
  FetchRequestor,
  LocalStorageBackend,
  DefaultCrypto,
  BaseTokenRequestHandler,
  AuthorizationNotifier,
  TokenRequest,
  GRANT_TYPE_AUTHORIZATION_CODE
} from '@openid/appauth';
import {NoHashQueryStringUtils} from './noHashQueryStringUtils';
import {ActivatedRoute, Router} from '@angular/router';


@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {

  configuration: AuthorizationServiceConfigurationJson = null;
  error: any = null;
  authorizationHandler: any = null;
  tokenHandler: any = null;
  notifier: any = null;
  request: any = null;
  response: any = null;
  code: string;

  constructor(private route: ActivatedRoute, private router: Router) {
    this.authorizationHandler = new RedirectRequestHandler(
      new LocalStorageBackend(),
      new NoHashQueryStringUtils(),
      window.location,
      new DefaultCrypto()
    );

    this.tokenHandler = new BaseTokenRequestHandler(new FetchRequestor());
    this.notifier = new AuthorizationNotifier();
    this.authorizationHandler.setAuthorizationNotifier(this.notifier);
    debugger
    this.notifier.setAuthorizationListener((request, response, error) => {
      console.log('Authorization request complete ', request, response, error);
      if (response) {
        this.request = request;
        this.response = response;
        this.code = response.code;
        console.log(`Authorization Code  ${response.code}`);

        let extras = null;
        if (this.request && this.request.internal) {
          extras = {};
          extras.code_verifier = this.request.internal.code_verifier;
        }

        const tokenRequest = new TokenRequest({
          client_id: environment.clientId,
          redirect_uri: environment.redirectURL,
          grant_type: GRANT_TYPE_AUTHORIZATION_CODE,
          code: this.code,
          refresh_token: undefined,
          extras
        });

        AuthorizationServiceConfiguration.fetchFromIssuer(environment.OPServer, new FetchRequestor())
          .then((oResponse: any) => {
            this.configuration = oResponse;
            return this.tokenHandler.performTokenRequest(this.configuration, tokenRequest);
          })
          .then((oResponse) => {
            localStorage.setItem('access_token', oResponse.accessToken);
            this.router.navigate(['/profile']);
          })
          .catch(oError => {
            this.error = oError;
          });
      }
    });
  }

  redirect() {
    AuthorizationServiceConfiguration.fetchFromIssuer(environment.OPServer, new FetchRequestor())
      .then((response: any) => {
        this.configuration = response;
        const authRequest = new AuthorizationRequest({
          client_id: environment.clientId,
          redirect_uri: environment.redirectURL,
          scope: environment.scope,
          response_type: AuthorizationRequest.RESPONSE_TYPE_CODE,
          state: undefined,
          // extras: environment.extra
        });
        this.authorizationHandler.performAuthorizationRequest(this.configuration, authRequest);
      })
      .catch(error => {
        this.error = error;
      });
  }

  handleCode() {
    this.code = this.route.snapshot.queryParams.code;

    if (!this.code) {
      this.error = 'Unable to get authorization code';
      return;
    }
    this.authorizationHandler.completeAuthorizationRequestIfPossible();
  }
}

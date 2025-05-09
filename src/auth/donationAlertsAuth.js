import * as arctic from 'arctic';

const clientId = 'YOUR_DONATIONALERTS_CLIENT_ID';
const clientSecret = 'YOUR_DONATIONALERTS_CLIENT_SECRET';
const redirectURI = 'http://localhost:5173/callback';

const donationAlerts = new arctic.GenericProvider({
  clientId,
  clientSecret,
  authorizationEndpoint: 'https://www.donationalerts.com/oauth/authorize',
  tokenEndpoint: 'https://www.donationalerts.com/oauth/token',
  redirectURI,
});
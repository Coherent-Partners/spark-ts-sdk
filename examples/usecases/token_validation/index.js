import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

async function validateToken(token) {
  try {
    const unverified = jwt.decode(token, { complete: true });
    const issuer = unverified?.payload?.iss;

    const client = jwksClient({ jwksUri: `${issuer}/protocol/openid-connect/certs` });
    const signingKey = (await client.getSigningKey(unverified.header.kid)).getPublicKey();
    const decoded = jwt.verify(token, signingKey, { issuer, algorithms: ['RS256'], audience: 'product-factory' });

    return { valid: true, decoded };
  } catch (error) {
    return { valid: false, error };
  }
}

async function main() {
  const TOKEN = 'my_access_token'; // Replace with your token here without 'Bearer ' prefix
  const { valid } = await validateToken(TOKEN);
  console.log(`Token is ${valid ? 'valid' : 'invalid'}`);
}

main();

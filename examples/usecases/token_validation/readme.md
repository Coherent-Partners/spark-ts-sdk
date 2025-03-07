## Validate JWTs against Keycloak

This example demonstrates how to decode and validate JSON web tokens (JWT) or bearer
tokens issued by [Keycloak].

Keycloak is the identity and access management solution used by Coherent Spark to
secure its services. It issues JWTs that can be used to authenticate and authorize
requests to the services.

There are scenarios such as [Xconnector] where you need to implement a remote service
that requires a bearer token to be passed in the request header. In order to trust
that token, you need to validate its signature against the Keycloak server before
proceeding with the request.

## Setup and Testing

To test this example, grab a JWT (without the prefix `Bearer`) issued by Keycloak
and modify the `TOKEN` variable in [index.js](index.js) with the JWT. Then, run the
following command:

```bash
npm start
```

The script will decode the JWT using [jsonwebtoken] and [jwks-rsa] dependencies and
validate its signature against Spark's Keycloak server. If and when the token is valid,
`validateToken()` returns an object that includes the validation status (i.e.,`valid`)
and the `decoded` token as a JSON object.

<!-- References -->

[Keycloak]: https://www.keycloak.org/
[xconnector]: https://docs.coherent.global/xconnector/introduction-to-xconnector
[jsonwebtoken]: https://www.npmjs.com/package/jsonwebtoken
[jwks-rsa]: https://www.npmjs.com/package/jwks-rsa

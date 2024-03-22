# How to contribute

These are a few guidelines that contributors need to follow to keep things easy.

## Getting Started

- Create a branch or fork the repository
- Check out the [Developer Guide](#developer-guide) below for setup instructions
- Add your functionality or fix a bug
- Ensure that your changes pass the tests
- Only refactoring and documentation changes require no new tests.
- Only pull requests with passing tests will be accepted.

## Submitting Changes

- Push your changes to your branch/fork.
- Submit a pull request.

## Additional Resources

- [General GitHub documentation](http://help.github.com/)
- [GitHub pull request documentation](http://help.github.com/send-pull-requests/)

---

## Developer Guide

As a developer, you should be aware of the following:

- Linting and formatting with `ESLint` and `Prettier`
- Testing with `Jest`
- CI/CD with [GitHub Actions](https://docs.github.com/en/actions/quickstart)

### Code Quality

This project uses [Husky](https://github.com/typicode/husky) to manage Git hooks,
and both `ESLint` and `Prettier` to help enforce code quality.

### Rollup

This project uses [Rollup](https://rollupjs.org/guide/en/) to bundle the code
for browser distribution. Located in `rollup.config.js`, the configuration is set
to output a CommonJS module and ES module.

### Unit Testing

This project uses [Jest](https://jestjs.io/) for unit testing. The `jest` setup
is located in the `jest` field of `package.json`. It only targets `*.spec.ts` files.
Only a portion of the codebase is tested, so feel free to add more tests.

### Installation

```bash
yarn install
```

### Tooling

```bash
# lint code
yarn run lint

# test code
yarn run test

# build code
yarn run build
```

To run an example, you will need to follow the instructions in the `examples/index.ts` file,
then run the following command:

```bash
yarn run demo
```

> **Disclaimer:** This project is inspired by many open-source SDKs and libraries.
> Among them are [openai-node], [box-typescript-sdk-gen], and [stripe-node]. In fact,
> the http client implementation is heavily based on both `openai-node` and
> `box-typescript-sdk-gen`'s approach to handling API requests.

[openai-node]: https://github.com/openai/openai-node
[box-typescript-sdk-gen]: https://github.com/box/box-typescript-sdk-gen
[stripe-node]: https://github.com/stripe/stripe-node

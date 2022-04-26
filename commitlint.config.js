module.exports = {
  extends: [
    "@commitlint/config-conventional", // https://gist.github.com/JonasPammer/4ea577854ae10afe644bff366d7b2a8a
  ],
  rules: {
    "header-max-length": [2, "always", 72 * 2],
    "body-max-line-length": [0, "always"],
    "footer-max-line-length": [0, "always"],
  },
};

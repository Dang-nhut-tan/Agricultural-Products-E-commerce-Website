class TestClientBase {
  constructor(page) {
    this.page = page;
  }

  async open(path, readyElement) {
    await this.page.goto(path);
    if (readyElement) {
      await readyElement.waitFor();
    }
  }
}

module.exports = TestClientBase;

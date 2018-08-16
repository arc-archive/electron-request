
describe('Test of tests', function() {
  it('Test if Blob can be directly converted to Buffer', () => {
    const blob = new Blob(['abc'], {type: 'text/plain'});
    console.log(blob);
    const buff = Buffer.from(blob);
    console.log(buff);
  })
});

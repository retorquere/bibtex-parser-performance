const Benchmark = require('benchmark');

const BP = require('@retorquere/bibtex-parser')
const BCC = require('biblatex-csl-converter')
const path = require('path')
const fs = require('fs')

const tests = []
for (const mode of ['import', 'export']) {
  const root = path.join(__dirname, '../better-bibtex/test/fixtures/', mode)
  for (const f of fs.readdirSync(root).sort()) {
    if (!f.replace(/(la)?tex$/, '').endsWith('.bib')) continue
    if (f.startsWith('Async')) continue
    if (f.includes('hopping')) continue

    tests.push({ i: tests.length +1, name: `${mode}/${f}`, bibtex: fs.readFileSync(path.join(root, f), 'utf-8') })
  }
}

BP.jabref(BP.parse('', { sentenceCase: false }).comments)

const speedups = {
  'biblatex-csl-converter': [],
  'bibtex-parser': [],
}

for (const test of tests) {
  const suite = new Benchmark.Suite

  console.log(`${test.name} (${test.i}/${tests.length})`)
  suite.add('biblatex-csl-converter', () => {
    const bibParser = new BCC.BibLatexParser(test.bibtex)
    const bibDB = bibParser.parse({
      processUnexpected: true,
      processUnknown: { comment: 'f_verbatim' },
      processInvalidURIs: true,
    })
    const exporter = new BCC.CSLExporter(bibDB)
    exporter.parse()
  })
  .add('bibtex-parser', () => {
    BP.jabref(BP.parse(test.bibtex, { sentenceCase: false }).comments)
  })
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    const fastest = this.filter('fastest').map('name')[0]
    const speedup = (fastest === 'biblatex-csl-converter' ? this[0].hz / this[1].hz : this[1].hz / this[0].hz)
    console.log(`Fastest is ${fastest}, speedup = ${speedup}`)
    speedups[fastest === 'biblatex-csl-converter' ? 'biblatex-csl-converter' : 'bibtex-parser'].push(speedup)
  })
  .run()
  console.log('')
}

function average(arr) { return arr.length ? arr.reduce((sum, n) => sum + n) / arr.length : '<none>' }
for (const [parser, speedup] of Object.entries(speedups)) {
  console.log(`${parser}: faster ${speedup.length} times, average speedup = ${average(speedup)}`)
}

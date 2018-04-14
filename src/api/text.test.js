const test = require('ava')
const { hershey_vector_char, hershey_vector_text, vector_text, vector_char } = require('./text')

test('vector_char', t => {
  const obs = vector_char(0, 2, 'O')
  const expSegments = [ [ [ 9, 23 ],
    [ 7, 22 ],
    [ 5, 20 ],
    [ 4, 18 ],
    [ 3, 15 ],
    [ 3, 10 ],
    [ 4, 7 ],
    [ 5, 5 ],
    [ 7, 3 ],
    [ 9, 2 ],
    [ 13, 2 ],
    [ 15, 3 ],
    [ 17, 5 ],
    [ 18, 7 ],
    [ 19, 10 ],
    [ 19, 15 ],
    [ 18, 18 ],
    [ 17, 20 ],
    [ 15, 22 ],
    [ 13, 23 ],
    [ 9, 23 ] ] ]

  t.deepEqual(obs.width, 22)
  t.deepEqual(obs.segments, expSegments)
})

// 37°48'18.9"N
test('hershey_vector_char', t => {
  const chars = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', 'O']
  chars.forEach(char => {
    const vectorChar = vector_char(0, 0, char)
    const hersheyVectorChar = hershey_vector_char(0, 0, char)
    t.deepEqual(vectorChar, hersheyVectorChar)
  })
})

test('vector_text', t => {
  const obs = vector_text(0, 0, 'Hi')
  const exp = [ [ [ 4, 21 ], [ 4, 0 ] ],
    [ [ 18, 21 ], [ 18, 0 ] ],
    [ [ 4, 11 ], [ 18, 11 ] ],
    [ [ 25, 21 ], [ 26, 20 ], [ 27, 21 ], [ 26, 22 ], [ 25, 21 ] ],
    [ [ 26, 14 ], [ 26, 0 ] ] ]

  t.deepEqual(obs, exp)
})

test('hershey_vector_text', t => {
  const word = 'Hi';
  const vectorWord = vector_text(0, 0, word)
  const hersheyVectorWord = hershey_vector_text(0, 0, word)
  t.deepEqual(vectorWord, hersheyVectorWord)
})

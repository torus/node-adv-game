const should = require('should')
const pg = require('pg')
const randomstring = require('randomstring')

describe('pg', () => {
  const client = new pg.Client()
  it('throws error when INSERTing with existing key', async () => {
    await client.connect()

    const key = randomstring.generate(10)
    await client.query({text: 'INSERT into test (key, value) VALUES ($1, $2)',
                    values: [key, 123]})

    try {
      await client.query({text: 'INSERT into test (key, value) VALUES ($1, $2)',
                          values: [key, 234]})
    } catch(e) {
      return
    }

    throw new Error()
  })
})

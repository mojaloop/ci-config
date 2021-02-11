const { main } = require('../src/pr-title')

const { config } = require('../src/config')
jest.mock('../src/config')

describe('pr-title', () => {
  it('checks the pr title', async () => {
    // Arrange
    console.log('config is', config)
    
    // Act
    console.log('hello')
    await main()

    // Assert
  })

  it.todo('fails silently ')
  it.todo('does not fail silently')
})
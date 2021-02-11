const { getPRTitle } = require('../src/lib')
jest.mock('../src/lib')
const { main } = require('../src/pr-title')


describe('pr-title', () => {
  // beforeEach(() => {
  //   // Octokit.mockClear()
  //   console.log('getPRTitle', getPRTitle)
  // })

  it('checks the pr title', async () => {
    // Arrange
    getPRTitle.mockResolvedValueOnce('chore: valid pr title')
    const config = {
      PULL_REQUEST_URL: 'https://mock-url.com',
      FAIL_SILENTLY_WHEN_MISSING_CIRCLE_PULL_REQUEST: true
    }
    
    // Act
    await main(config)

    // Assert
    //nothing threw!
  })

  it('fails silently with an empty `PULL_REQUEST_URL`', async () => {
    // Arrange
    const config = {
      PULL_REQUEST_URL: '',
      FAIL_SILENTLY_WHEN_MISSING_CIRCLE_PULL_REQUEST: true
    }

    // Act
    await main(config)

    // Assert
    //nothing threw!
  })

  it('does not silently with an empty `PULL_REQUEST_URL`', async () => {
    // Arrange
    const config = {
      PULL_REQUEST_URL: '',
      FAIL_SILENTLY_WHEN_MISSING_CIRCLE_PULL_REQUEST: false
    }

    // Act
    const action = async () => await main(config)

    // Assert
    await expect(action()).rejects.toThrow('No PR is associated with this build.')
  })

})
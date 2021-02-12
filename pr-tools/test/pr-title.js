const { getPRTitle } = require('../src/lib')
jest.mock('../src/lib')
const { main } = require('../src/pr-title')


describe('pr-title', () => {
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

  it('checks the pr title with no space after the colon', async () => {
    // Arrange
    getPRTitle.mockResolvedValueOnce('chore:invalid pr title')
    const config = {
      PULL_REQUEST_URL: 'https://mock-url.com',
      FAIL_SILENTLY_WHEN_MISSING_CIRCLE_PULL_REQUEST: true
    }
    
    // Act
    const action = async () => await main(config)

    // Assert
    await expect(action()).rejects.toThrow('PR title')
  })

  it('allows breaking change one liners', async () => {
    // Arrange
    getPRTitle.mockResolvedValueOnce('refactor!: drop support for Node 6')
    const config = {
      PULL_REQUEST_URL: 'https://mock-url.com',
      FAIL_SILENTLY_WHEN_MISSING_CIRCLE_PULL_REQUEST: true
    }
    
    // Act
    await main(config)

    // Assert
    //nothing threw!
  })

  it('allows breaking change one liners', async () => {
    // Arrange
    getPRTitle.mockResolvedValueOnce('refactor(thingo)!: drop support for Node 6')
    const config = {
      PULL_REQUEST_URL: 'https://mock-url.com',
      FAIL_SILENTLY_WHEN_MISSING_CIRCLE_PULL_REQUEST: true
    }
    
    // Act
    await main(config)

    // Assert
    //nothing threw!
  })

  it('fails on a bad PR title', async () => {
    // Arrange
    getPRTitle.mockResolvedValueOnce('invalid pr title :(')
    const config = {
      PULL_REQUEST_URL: 'https://mock-url.com',
      FAIL_SILENTLY_WHEN_MISSING_CIRCLE_PULL_REQUEST: true,
      GET_HELP_URL: 'help.com'
    }

    // Act
    const action = async () => await main(config)

    // Assert
    await expect(action()).rejects.toThrow('PR title')
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
import { IcpNotFoundError } from './errors'

const baseURL = 'https://hlwicpfwc.miit.gov.cn/icpproject_query/api'

const withCommonHeaders = (headers: Record<string, string> = {}) => ({
  'user-agent':
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; WOW64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36',
  referer: 'https://beian.miit.gov.cn/',
  ...headers,
})

const withContentType = (contentType: string, headers: Record<string, string> = {}) =>
  withCommonHeaders({
    'content-type': contentType,
    ...headers,
  })

const assertSuccessResponse = async (response: Response) => {
  const { code, params } = await response.json()
  if (code !== 200) throw new Error(`request failed with code ${code}`)
  return params
}

export type Token = string

export const getToken = async () => {
  const response = await fetch(`${baseURL}/auth`, {
    method: 'POST',
    headers: withContentType('application/x-www-form-urlencoded'),
    body: 'authKey=aec87fd281326f94bf34b3d1f4809982&timeStamp=0',
  })
  const { bussiness: value } = await assertSuccessResponse(response)
  return value as Token
}

export type QueryIcpResult = {
  subject: {
    name: string
    nature: string
    approvedAt: Date
    license: string
  }
  website: {
    name: string
    domain: string
    homepage: string
    license: string
  }
}

export const queryIcp = async (token: Token, domain: string): Promise<QueryIcpResult> => {
  const response = await fetch(`${baseURL}/icpAbbreviateInfo/queryByCondition`, {
    method: 'POST',
    headers: withContentType('application/json', { token }),
    body: JSON.stringify({ unitName: domain }),
  })
  const { code, params } = await response.json()
  if (code !== 200) throw new Error(`failed to obtain token with code ${code}`)
  const result = params.list[0]
  if (!result) throw new IcpNotFoundError()
  return {
    subject: {
      name: result.unitName,
      nature: result.natureName,
      approvedAt: new Date(result.updateRecordTime as string),
      license: result.mainLicence as string,
    },
    website: {
      name: result.serviceName,
      domain: result.domain as string,
      homepage: result.homeUrl as string,
      license: result.serviceLicence as string,
    },
  }
}

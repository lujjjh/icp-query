# ICP Query

A simple ICP query service powered by Cloudflare Workers.

The original API was published at [yitd/ICP-API](https://github.com/yitd/ICP-API) by [@yitd](https://github.com/yitd).

## SLA

This service is built solely for the purpose of learning [Cloudflare Workers](https://workers.cloudflare.com/).
There is no SLA provided.

**Use at your own risk.**

## Usage

**Request**

```http
GET https://icp-query.lujjjh.workers.dev/g.cn
```

**Response**

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "subject": {
    "name": "北京谷翔信息技术有限公司",
    "nature": "企业",
    "approvedAt": "2020-11-26T09:49:11.000Z",
    "license": "京ICP备13004732号"
  },
  "website": {
    "name": "谷歌",
    "domain": "g.cn",
    "homepage": "www.g.cn",
    "license": "京ICP备13004732号-2"
  }
}
```

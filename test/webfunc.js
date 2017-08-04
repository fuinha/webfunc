/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const { assert } = require('chai')
const httpMocks = require('node-mocks-http')
const { setResponseHeaders, serveHttp, handleHttpRequest, app } = require('../src/webfunc')

const appconfig = {
	headers: {
		'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
		'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Max-Age': '1296000'
	}
}

/*eslint-disable */
describe('webfunc', () => 
	describe('#setResponseHeaders', () => 
		it('Should set headers.', () => {
			/*eslint-enable */
			const res = httpMocks.createResponse()
			return setResponseHeaders(res, appconfig).then(res => {
				const headers = res._getHeaders()
				assert.isOk(headers)
				assert.equal(headers['Access-Control-Allow-Methods'], 'GET, HEAD, OPTIONS, POST')
				assert.equal(headers['Access-Control-Allow-Headers'], 'Authorization, Content-Type, Origin')
				assert.equal(headers['Access-Control-Allow-Origin'], '*')
				assert.equal(headers['Access-Control-Max-Age'], '1296000')
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#handleHttpRequest: 01', () => 
		it('Should NOT fail if no CORS settings have been set up and the same origin policy if satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080/helloworld/'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {}
			return handleHttpRequest(req, res, appconfig).then(() => {
				assert.isOk(1)
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#handleHttpRequest: 02', () => 
		it('Should fail if no CORS settings have been set up and the same origin policy if NOT satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://example.com/helloworld/'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {}
			return handleHttpRequest(req, res, appconfig).then(() => {
				assert.equal(1,2)
			}).catch(err => {
				assert.equal(err.message,'Forbidden - CORS issue. Origin \'http://localhost:8080\' is not allowed.')
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#handleHttpRequest: 03', () => 
		it('Should NOT fail if CORS settings have been set up (*) and the same origin policy if NOT satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://example.com/helloworld/'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Max-Age': '1296000'
				}
			}
			return handleHttpRequest(req, res, appconfig).then(() => {
				assert.equal(1,1)
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#handleHttpRequest: 04', () => 
		it('Should NOT fail if CORS settings have been set up (http://localhost:8080) and the same origin policy if NOT satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://example.com/helloworld/'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}
			return handleHttpRequest(req, res, appconfig).then(() => {
				assert.equal(1,1)
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#handleHttpRequest: 05', () => 
		it('Should fail if CORS settings have been set up (http://boris.com) and the same origin policy if NOT satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://example.com/helloworld/'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com',
					'Access-Control-Max-Age': '1296000'
				}
			}
			return handleHttpRequest(req, res, appconfig).then(() => {
				assert.equal(1,2)
			}).catch(err => {
				assert.equal(err.message,'Forbidden - CORS issue. Origin \'http://localhost:8080\' is not allowed.')
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#handleHttpRequest: 06', () => 
		it('Should NOT fail if CORS settings have been set up (http://boris.com, http://localhost:8080) and the same origin policy if NOT satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://example.com/helloworld/'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}
			return handleHttpRequest(req, res, appconfig).then(() => {
				assert.equal(1,1)
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#handleHttpRequest: 07', () => 
		it('Should fail if a POST request if sent and the CORS settings have been set up (POST not supported) and the same origin policy if NOT satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'POST',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}
			return handleHttpRequest(req, res, appconfig).then(() => {
				assert.equal(1,2)
			}).catch((err) => {
				assert.equal(err.message, 'Forbidden - CORS issue. Method \'POST\' is not allowed.')
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#handleHttpRequest: 08', () => 
		it('Should NOT fail if a PUT request if sent and the CORS settings have been set up (POST is supported) and the same origin policy if NOT satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'PUT',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST, PUT',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}
			return handleHttpRequest(req, res, appconfig).then(() => {
				assert.equal(1,1)
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#handleHttpRequest: 09', () => 
		it('Should fail if a PUT request if sent and no CORS settings have been set up.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'PUT',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {}
			return handleHttpRequest(req, res, appconfig).then(() => {
				assert.equal(1,2)
			})
				.catch(err => assert.equal(err.message, 'Forbidden - CORS issue. Method \'PUT\' is not allowed.'))
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#serveHttp: 01', () => 
		it('Should NOT fail if no CORS settings have been set up and the same origin policy if satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080/helloworld/'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {}
			const fn = serveHttp((req, res) => {
				res.status(200).send('Hello World')
				return res
			}, appconfig)
			return fn(req, res).then(res => {
				assert.equal(res._getData(),'Hello World')
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#serveHttp: 02', () => 
		it('Should fail if no CORS settings have been set up and the same origin policy if NOT satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://example.com/helloworld/'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {}
			const fn = serveHttp((req, res) => {
				res.status(200).send('Hello World')
				return res
			}, appconfig)
			return fn(req, res)
				.then(() => {
					assert.equal(1,2)
				}).catch(err => {
					assert.equal(err.message,'Forbidden - CORS issue. Origin \'http://localhost:8080\' is not allowed.')
				})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#serveHttp: 03', () => 
		it('Should NOT fail if CORS settings have been set up (*) and the same origin policy if NOT satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://example.com/helloworld/'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Max-Age': '1296000'
				}
			}
			const fn = serveHttp((req, res) => {
				res.status(200).send('Hello World')
				return res
			}, appconfig)
			return fn(req, res).then(res => {
				assert.equal(res._getData(),'Hello World')
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#serveHttp: 04', () => 
		it('Should NOT fail if CORS settings have been set up (http://localhost:8080) and the same origin policy if NOT satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://example.com/helloworld/'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}
			const fn = serveHttp((req, res) => {
				res.status(200).send('Hello World')
				return res
			}, appconfig)
			return fn(req, res).then(res => {
				assert.equal(res._getData(),'Hello World')
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#serveHttp: 05', () => 
		it('Should fail if CORS settings have been set up (http://boris.com) and the same origin policy if NOT satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://example.com/helloworld/'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com',
					'Access-Control-Max-Age': '1296000'
				}
			}
			const fn = serveHttp((req, res) => {
				res.status(200).send('Hello World')
				return res
			}, appconfig)
			return fn(req, res).then(() => {
				assert.equal(1,2)
			}).catch(err => {
				assert.equal(err.message,'Forbidden - CORS issue. Origin \'http://localhost:8080\' is not allowed.')
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#serveHttp: 06', () => 
		it('Should NOT fail if CORS settings have been set up (http://boris.com, http://localhost:8080) and the same origin policy if NOT satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://example.com/helloworld/'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}
			const fn = serveHttp((req, res) => {
				res.status(200).send('Hello World')
				return res
			}, appconfig)
			return fn(req, res).then(res => {
				assert.equal(res._getData(),'Hello World')
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#serveHttp: 07', () => 
		it('Should fail if a POST request if sent and the CORS settings have been set up (POST not supported) and the same origin policy if NOT satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'POST',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}
			const fn = serveHttp((req, res) => {
				res.status(200).send('Hello World')
				return res
			}, appconfig)
			return fn(req, res).then(() => {
				assert.equal(1,2)
			}).catch((err) => {
				assert.equal(err.message, 'Forbidden - CORS issue. Method \'POST\' is not allowed.')
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#serveHttp: 08', () => 
		it('Should NOT fail if a PUT request if sent and the CORS settings have been set up (POST is supported) and the same origin policy if NOT satisfied.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'PUT',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST, PUT',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}
			const fn = serveHttp((req, res) => {
				res.status(200).send('Hello World')
				return res
			}, appconfig)
			return fn(req, res).then(res => {
				assert.equal(res._getData(),'Hello World')
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#serveHttp: 09', () => 
		it('Should fail if a PUT request if sent and no CORS settings have been set up.', () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'PUT',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {}
			const fn = serveHttp((req, res) => {
				res.status(200).send('Hello World')
				return res
			}, appconfig)
			return fn(req, res).then(() => {
				assert.equal(1,2)
			})
				.catch(err => assert.equal(err.message, 'Forbidden - CORS issue. Method \'PUT\' is not allowed.'))
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#serveHttp: 10', () => 
		it(`Should contains CORS headers if they've been set up.`, () => {
			/*eslint-enable */
			const req = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				}
			})
			const res = httpMocks.createResponse()
			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}
			const fn = serveHttp((req, res) => {
				res.status(200).send('Hello World')
				return res
			}, appconfig)
			return fn(req, res).then(res => {
				assert.equal(res._getData(),'Hello World')
				const headers = res._getHeaders()
				assert.isOk(headers)
				assert.equal(headers['Access-Control-Allow-Methods'], 'GET, HEAD, OPTIONS, POST')
				assert.equal(headers['Access-Control-Allow-Headers'], 'Authorization, Content-Type, Origin')
				assert.equal(headers['Access-Control-Allow-Origin'], 'http://boris.com, http://localhost:8080')
				assert.equal(headers['Access-Control-Max-Age'], '1296000')
			})
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#serveHttp: 11', () => 
		it(`Should support one endpoint definition.`, () => {
			/*eslint-enable */
			const req_01 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				},
				_parsedUrl: {
					pathname: '/users'
				}
			})
			const res_01 = httpMocks.createResponse()

			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}

			const fn = serveHttp(app.get('/users', (req, res) => { res.status(200).send('Hello User'); return res }), appconfig)

			const result_01 = fn(req_01, res_01).then(() => {
				assert.equal(res_01._getData(),'Hello User')
				const headers = res_01._getHeaders()
				assert.isOk(headers)
				assert.equal(headers['Access-Control-Allow-Methods'], 'GET, HEAD, OPTIONS, POST')
				assert.equal(headers['Access-Control-Allow-Headers'], 'Authorization, Content-Type, Origin')
				assert.equal(headers['Access-Control-Allow-Origin'], 'http://boris.com, http://localhost:8080')
				assert.equal(headers['Access-Control-Max-Age'], '1296000')
			})

			return Promise.all([result_01])
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#serveHttp: 12', () => 
		it(`Should support multiple endpoints definitions.`, () => {
			/*eslint-enable */
			const req_01 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				},
				_parsedUrl: {
					pathname: '/users'
				}
			})
			const res_01 = httpMocks.createResponse()

			const req_02 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				},
				_parsedUrl: {
					pathname: '/companies'
				}
			})
			const res_02 = httpMocks.createResponse()

			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}

			const endpoints = [
				app.get('/users', (req, res) => { res.status(200).send('Hello User'); return res }),
				app.get('/companies', (req, res) => { res.status(200).send('Hello Companies'); return res })
			]

			const fn = serveHttp(endpoints, appconfig)

			const result_01 = fn(req_01, res_01).then(() => {
				assert.equal(res_01._getData(),'Hello User')
				const headers = res_01._getHeaders()
				assert.isOk(headers)
				assert.equal(headers['Access-Control-Allow-Methods'], 'GET, HEAD, OPTIONS, POST')
				assert.equal(headers['Access-Control-Allow-Headers'], 'Authorization, Content-Type, Origin')
				assert.equal(headers['Access-Control-Allow-Origin'], 'http://boris.com, http://localhost:8080')
				assert.equal(headers['Access-Control-Max-Age'], '1296000')
			})
			const result_02 = fn(req_02, res_02).then(() => {
				assert.equal(res_02._getData(),'Hello Companies')
				const headers = res_02._getHeaders()
				assert.isOk(headers)
				assert.equal(headers['Access-Control-Allow-Methods'], 'GET, HEAD, OPTIONS, POST')
				assert.equal(headers['Access-Control-Allow-Headers'], 'Authorization, Content-Type, Origin')
				assert.equal(headers['Access-Control-Allow-Origin'], 'http://boris.com, http://localhost:8080')
				assert.equal(headers['Access-Control-Max-Age'], '1296000')
			})

			return Promise.all([result_01, result_02])
		})))

/*eslint-disable */
describe('webfunc', () => 
	describe('#serveHttp: 13', () => 
		it(`Should support complex routing with parameters and querystring.`, () => {
			/*eslint-enable */
			const req_01 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				},
				_parsedUrl: {
					pathname: '/users/nicolas/account/1234'
				}
			})
			const res_01 = httpMocks.createResponse()

			const req_02 = httpMocks.createRequest({
				method: 'GET',
				headers: {
					origin: 'http://localhost:8080',
					referer: 'http://localhost:8080'
				},
				_parsedUrl: {
					pathname: '/company/neap'
				},
				query: { hello: 'world' }
			})
			const res_02 = httpMocks.createResponse()

			const appconfig = {
				headers: {
					'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS, POST',
					'Access-Control-Allow-Headers': 'Authorization, Content-Type, Origin',
					'Access-Control-Allow-Origin': 'http://boris.com, http://localhost:8080',
					'Access-Control-Max-Age': '1296000'
				}
			}

			const endpoints = [
				app.get('/users/{username}/account/{accountId}', (req, res, params) => { 
					res.status(200).send(`Hello ${params.username} (account: ${params.accountId})`)
					return res 
				}),
				app.get('/company/{name}', (req, res, params) => { 
					res.status(200).send(`Hello ${params.name} (Hello: ${params.hello})`)
					return res 
				})
			]

			const fn = serveHttp(endpoints, appconfig)

			const result_01 = fn(req_01, res_01).then(() => {
				assert.equal(res_01._getData(),'Hello nicolas (account: 1234)')
				const headers = res_01._getHeaders()
				assert.isOk(headers)
				assert.equal(headers['Access-Control-Allow-Methods'], 'GET, HEAD, OPTIONS, POST')
				assert.equal(headers['Access-Control-Allow-Headers'], 'Authorization, Content-Type, Origin')
				assert.equal(headers['Access-Control-Allow-Origin'], 'http://boris.com, http://localhost:8080')
				assert.equal(headers['Access-Control-Max-Age'], '1296000')
			})
			const result_02 = fn(req_02, res_02).then(() => {
				assert.equal(res_02._getData(),'Hello neap (Hello: world)')
				const headers = res_02._getHeaders()
				assert.isOk(headers)
				assert.equal(headers['Access-Control-Allow-Methods'], 'GET, HEAD, OPTIONS, POST')
				assert.equal(headers['Access-Control-Allow-Headers'], 'Authorization, Content-Type, Origin')
				assert.equal(headers['Access-Control-Allow-Origin'], 'http://boris.com, http://localhost:8080')
				assert.equal(headers['Access-Control-Max-Age'], '1296000')
			})

			return Promise.all([result_01, result_02])
		})))
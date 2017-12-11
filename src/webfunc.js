/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const path = require('path')
const fs = require('fs')
const serialize = require('serialize-javascript')
const { getRouteDetails, matchRoute } = require('./routing')
const { app, HttpHandler } = require('./handler')
require('colors')

/*eslint-disable */
const cwdPath = f => path.join(process.cwd(), f)
const getProcess = () => process
const getProcessEnv = () => process.env || {}
/*eslint-enable */

let _appconfig = null
const getAppConfig = memoize => {
	const skipMemoization = memoize == undefined ? false : !memoize
	if (!skipMemoization || _appconfig == null) {
		const appconfigPath = cwdPath('appconfig.json')
		_appconfig = fs.existsSync(appconfigPath) ? require(appconfigPath) : undefined
		if (!_appconfig) {
			const nowconfigPath = cwdPath('now.json')
			_appconfig = fs.existsSync(nowconfigPath) ? require(nowconfigPath) : undefined
		}
	}
	return _appconfig
}

const getActiveEnv = memoize => {
	const appconfig = getAppConfig(memoize)
	const activeEnv = ((appconfig || {}).env || {}).active
	if (activeEnv) 
		return Object.assign((appconfig.env[activeEnv] || {}), { _name: activeEnv })
	else
		return null
}

let headersCollection = null
const getHeadersCollection = (headers = {}, memoize) => {
	if (!memoize || headersCollection == null) {
		headersCollection = []
		for (let key in headers)
			headersCollection.push({ key, value: headers[key] })
	}
	return headersCollection
}

let allowedOrigins = null
const getAllowedOrigins = (headers = {}, memoize) => {
	if (!memoize || allowedOrigins == null) {
		allowedOrigins = (headers['Access-Control-Allow-Origin'] || '').split(',')
			.reduce((a, s) => { 
				if (s)
					a[s.trim().toLowerCase().replace(/\/$/,'')] = true 
				return a 
			}, {})
	}
	return allowedOrigins
}  

let allowedMethods = null
const getAllowedMethods = (headers = {}, memoize) => {
	if (!memoize || allowedMethods == null) {
		allowedMethods = (headers['Access-Control-Allow-Methods'] || '').split(',')
			.reduce((a, s) => { 
				if (s)
					a[s.trim().toLowerCase()] = true 
				return a 
			}, {})
	}
	return allowedMethods
}  

const setResponseHeaders = (res, appconfig) => Promise.resolve((appconfig || getAppConfig() || {}).headers)
	.then(headers => {
		if (!res.set)
			res.set = res.setHeader
		if (!res.send)
			res.send = res.end
		if (!res.status)
			res.status = code => { res.statusCode = code; return res }
		return getHeadersCollection(headers, !appconfig).reduce((response, header) => {
			res.set(header.key, header.value)
			return res 
		}, res)
	})

const handleHttpRequest = (req, res, appconfig) => Promise.resolve(appconfig || getAppConfig() || {})
	.then(appConfig => {
		const headers = appConfig.headers
		const noConfig = !appConfig.headers && !appConfig.env
		const memoize = !appconfig
		const origins = getAllowedOrigins(headers, memoize)
		const methods = getAllowedMethods(headers, memoize)
		const origin = new String(req.headers.origin).toLowerCase()
		const referer = new String(req.headers.referer).toLowerCase()
		const method = new String(req.method).toLowerCase()
		const sameOrigin = referer.indexOf(origin) == 0

		if (noConfig) {
			if (!sameOrigin)
				return setResponseHeaders(res, appConfig).then(res => res.status(403).send(`Forbidden - CORS issue. Origin '${origin}' is not allowed.`))

			if (method != 'head' && method != 'get' && method != 'options' && method != 'post') 
				return setResponseHeaders(res, appConfig).then(res => res.status(403).send(`Forbidden - CORS issue. Method '${method.toUpperCase()}' is not allowed.`))
		}
		// Check CORS
		
		if (!origins['*'] && Object.keys(origins).length != 0 && !(origin in origins)) 
			return setResponseHeaders(res, appConfig).then(res => res.status(403).send(`Forbidden - CORS issue. Origin '${origin}' is not allowed.`))

		if (Object.keys(methods).length != 0 && method != 'get' && method != 'head' && !(method in methods)) 
			return setResponseHeaders(res, appConfig).then(res => res.status(403).send(`Forbidden - CORS issue. Method '${method.toUpperCase()}' is not allowed.`))

		if (method == 'head' || method == 'options')
			return setResponseHeaders(res, appConfig).then(res => res.status(200).send())
	})
	.then(() => ({ req, res }))

/**
 * Returns a function (req, res) => ... that the Google Cloud Function expects.
 * 
 * @param  {String|Function|Array|Object} 	arg1 	Here what it means based on its type:
 *                                               	- String: Route path (e.g. '/users/{userId}/account')
 *                                               	- Function: Callback function (req, res) => ... This gets executed after all the headers checks.
 *                                               	- Array: Array of endpoints (e.g. [app.get('/users', (req, res, params) => ...), app.post('/stories', (req, res, params) => ...)])
 *                                               	- Object: Endpoint (e.g. app.get('/users', (req, res, params) => ...))
 * @param  {Function|Object} 				arg2 	Here what it means based on its type:
 *                                     				- Function: Callback function (req, res) => ... This gets executed after all the headers checks.
 *                                     				- Object: appconfig. If it exists, it will override the appconfig.json file.
 * @param  {object} 						arg3 	appconfig. If it exists, it will override the appconfig.json file.
 * @return {function}                    	(req, res) => ...
 */
const serveHttp = (arg1, arg2, arg3) => {
	const appConfigFile = getAppConfig() || {}
	const appConfigArg = arg3 || {}
	let _appconfig = null
	let route = null
	let httpNextRequest = null
	const typeOfArg1 = typeof(arg1 || undefined)
	const typeOfArg2 = typeof(arg2 || undefined)
	
	if (arg1) { 
		if (typeOfArg1 == 'string') {
			route = getRouteDetails(arg1)
			_appconfig = Object.assign(appConfigFile, appConfigArg)
			if (typeOfArg2 == 'function')
				httpNextRequest = arg2
			else
				throw new Error('Wrong argument exception. If the first argument of the \'serveHttp\' method is a route, then the second argument must be a function similar to (req, res, params) => ...')
		}
		else {
			_appconfig = Object.assign(appConfigFile, arg2 || {})
			if (typeOfArg1 == 'function') 
				httpNextRequest = arg1
			else if (arg1.length != undefined)
				return serveHttpEndpoints(arg1, _appconfig)
			else if (typeOfArg1 == 'object')
				return serveHttpEndpoints([arg1], _appconfig)
			else
				throw new Error('Wrong argument exception. If the first argument of the \'serveHttp\' method is not a route, then it must either be a function similar to (req, res, params) => ... or an array of endpoints.')
		}
	}
	else
		throw new Error('Wrong argument exception. The first argument of the \'serveHttp\' method must either be a route, a function similar to (req, res, params) => ... or an array of endpoints.')

	const cloudFunction = (req, res) => {
		let parameters = {}
		if (route) {
			const httpEndpoint = ((req._parsedUrl || {}).pathname || '/').toLowerCase()
			const r = matchRoute(httpEndpoint, route)
			if (!r) {
				return setResponseHeaders(res, _appconfig).then(res => {
					res.status(404).send(`Endpoint '${httpEndpoint}' not found.`)
					return { req, res }
				})
			}
			else
				parameters = r.parameters
		}

		return handleHttpRequest(req, res, _appconfig)
			.then(() => !res.headersSent 
				? setResponseHeaders(res, _appconfig).then(res => httpNextRequest(req, res, Object.assign(parameters, getRequestParameters(req)))) 
				: res)
			.then(() => ({ req, res }))
	}
		
	return cloudFunction
}

const _supportedHostings = { 'now': true, 'sh': true, 'localhost': true, 'express': true, 'gcp': true, 'aws': true }
const listen = (functionName, port) => {
	const _appconfig = getAppConfig() || {}

	const envName = !_appconfig ? 'default' : ((_appconfig.env || {}).active || 'default')
	const env = ((_appconfig || {}).env || {})[envName] || {}
	const hostingType = env.hostingType || 'localhost'
	if (!_supportedHostings[hostingType.toLowerCase()])
		throw new Error(`Unsupported hosting type '${hostingType}'`)

	const hostCategory = !hostingType || hostingType == 'localhost' || hostingType == 'now' ? 'express' : hostingType

	switch(hostCategory) {
	case 'express': {
		const expressConfig = ((_appconfig || {}).localhost || {})
		const explicitPort = (expressConfig.port || getProcessEnv().PORT) * 1
		if (!port)
			port = explicitPort || 3000
		const notLocal = hostingType != 'localhost'
		const startMessage = notLocal
			? `Ready to receive traffic${explicitPort ? ` on port ${explicitPort}` : ''}`
			: `Ready to receive traffic on ${`http://localhost:${port}`.bold.italic}`.cyan
		const secondMsg = notLocal ? '' : 'Press Ctrl+C to stop the server'.cyan
		return `
				const express = require('express')
				const server = express()
				server.all('*', ${functionName})
				server.listen(${port}, () => { console.log("${startMessage}"); ${secondMsg ? `console.log("${secondMsg}")` : ''}})
				`
	}
	case 'gcp':
		return `exports.handler = ${functionName}`
	}
}

const getRequestParameters = req => {
	let bodyParameters = {}
	if (req.body) {
		const bodyType = typeof(req.body)
		if (bodyType == 'object')
			bodyParameters = req.body
		else if (bodyType == 'string') {
			try {
				bodyParameters = JSON.parse(req.body)
			}
			catch(err) {
				bodyParameters = {}
				console.log(err)
			}
		}
	}
	const parameters = Object.assign((bodyParameters || {}), req.query || {})

	return parameters
}

/**
 * Returns a function (req, res) => ... that the Google Cloud Function expects.
 * 
 * @param  {array} endpoints  	e.g. [{ route: { name: '/user', params: ..., regex: ... }, method: 'GET', httpNext: (req, res, params) => ... }, ...]
 * @param  {object} appconfig 	Optional configuration file. If it exists, it will override the appconfig.json file.
 * @return {function}           (req, res) => ...
 */
const serveHttpEndpoints = (endpoints, appconfig) => {
	if (!endpoints || !endpoints.length)
		throw new Error('No endpoints have been defined.')

	const _appconfig = Object.assign(getAppConfig() || {}, appconfig || {})
	const cloudFunction = (req, res) => handleHttpRequest(req, res, _appconfig)
		.then(() => !res.headersSent 
			? setResponseHeaders(res, _appconfig).then(res => {
				const httpEndpoint = ((req._parsedUrl || {}).pathname || '/').toLowerCase()
				const httpMethod = (req.method || '').toUpperCase()
				const endpoint = httpEndpoint == '/' 
					? endpoints.filter(e => e.route.name == '/' && (e.method == httpMethod || !e.method))[0]
					: (endpoints.map(e => ({ endpoint: e, route: matchRoute(httpEndpoint, e.route) }))
						.filter(e => e.route && (e.endpoint.method == httpMethod || !e.endpoint.method))
						.sort((a, b) => b.route.match.length - a.route.match.length)[0] || {}).endpoint

				if (!endpoint) 
					return res.send(404, `Endpoint '${httpEndpoint}' for method ${httpMethod} not found.`)

				const next = endpoint.next || (() => Promise.resolve(null))
				if (typeof(next) != 'function') 
					return res.send(500, `Wrong argument exception. Endpoint '${httpEndpoint}' for method ${httpMethod} defines a 'next' argument that is not a function similar to '(req, res, params) => ...'.`) 

				const parameters = getRequestParameters(req)
				const requestParameters = matchRoute(httpEndpoint, endpoint.route).parameters

				return next(req, res, Object.assign(parameters, requestParameters))
			}) 
			: res)
		.then(() => ({ req, res }))
		
	return cloudFunction
}



module.exports = {
	setResponseHeaders,
	handleHttpRequest,
	serveHttp,
	listen,
	getAppConfig,
	getActiveEnv,
	app: app(),
	HttpHandler,
	routing: { 
		getRouteDetails,
		matchRoute
	}
}
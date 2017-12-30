/**
 * Copyright (c) 2017, Neap Pty Ltd.
 * All rights reserved.
 * 
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
*/
const fs = require('fs')
const shortid = require('shortid')
const path = require('path')
const { getRouteDetails, matchRoute } = require('./routing')
const { reqUtil } = require('./utils')
require('colors')

/*eslint-disable */
const cwdPath = f => path.join(process.cwd(), f)
const getProcessEnv = () => process.env || {}
const addEnvToProcess = (key,value) => {
	if (key)
		process.env[key] = value
}
/*eslint-enable */

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////// 							START - INITIALIZE APP 							  ////////////////////////

// This will get the configuration from the 'now.json' to configure the app
const CONFIGPATH = cwdPath('now.json')
const HOSTINGS = { 'now': true, 'sh': true, 'localhost': true, 'express': true, 'gcp': true, 'aws': true }
const PARAMSMODE = { 'all': true, 'body': true, 'route': true, 'none': true }
const getAppConfig = () => fs.existsSync(CONFIGPATH) ? require(CONFIGPATH) : {}
const getRequiredResponseHeaders = (config={}) => {
	const headers = config.headers || {}
	const headersCollection = []
	for (let key in headers)
		headersCollection.push({ key, value: headers[key] })

	return headersCollection
}
const getAllowedOrigins = (config={}) => 
	((config.headers || {})['Access-Control-Allow-Origin'] || '')
		.split(',')
		.reduce((a, s) => { 
			if (s) a[s.trim().toLowerCase().replace(/\/$/,'')] = true 
			return a 
		}, {})

const getAllowedMethods = (config={}) => 
	((config.headers || {})['Access-Control-Allow-Methods'] || '')
		.split(',')
		.reduce((a, s) => { 
			if (s) a[s.trim().toLowerCase()] = true 
			return a 
		}, {})

let _config = getAppConfig() // Object
let _requiredResponseHeaders = getRequiredResponseHeaders(_config) // Array
let _allowedOrigins = getAllowedOrigins(_config) // Object
let _allowedMethods = getAllowedMethods(_config) // Object
let _preEvent = () => Promise.resolve(null)
let _postEvent = () => Promise.resolve(null)

//////////////////////// 							END - INITIALIZE APP 							  ////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const getEnvName = () => ((_config || {}).env || {}).active || 'default'
const getEnv = () => ((_config || {}).env || {})[getEnvName()] || {}
const getHostingType = () => getEnv().hostingType || 'localhost'

/**
 * Converts a function similar to (req, res, next, params) => ... to a promise similar to (req, res, params) => ...
 * 
 * @param  {Function} handler 	(req, res, next, params) => ...
 * @return {Promise}     		(req, res, params) => ...
 */
const handlerToPromise = handler => (req, res, params={}) => new Promise((onSuccess, onFailure) => {
	try {
		handler(req, res, onSuccess, params)
	}
	catch(err) {
		onFailure(err)
	}
})

/**
 * Converts a function similar to (req, res, params) => ... to a promise similar to (req, res, params) => ...
 * 
 * @param  {Function} next 	(req, res, params) => ...
 * @return {Promise}     	(req, res, params) => ...
 */
const nextToPromise = next => (req, res, params={}) => Promise.resolve(null).then(() => next(req, res, params))

const executeHandlers = (req, res, params={}, handlers=[]) => 
	handlers.reduce(
		(acc, handler) => acc.then(() => handler(req, res, params)), 
		Promise.resolve(null))

const resetConfig = (config={}) => {
	_config = config
	_requiredResponseHeaders = getRequiredResponseHeaders(config)
	_allowedOrigins = getAllowedOrigins(config)
	_allowedMethods = getAllowedMethods(config)
}

let _handlers = []
let _endpoints = []
const app = {
	use: handlerOrConfig => {
		if (!handlerOrConfig)
			throw new Error('Missing required argument. The \'use\' function requires one argument.')
		const inputType = typeof(handlerOrConfig)
		if (inputType == 'function')
			_handlers.push(handlerToPromise(handlerOrConfig))
		else if (inputType == 'object')
			resetConfig(Object.assign(_config, handlerOrConfig))
		else
			throw new Error('Wrong argument exception. The input of the \'use\' function must either be a handler function (e.g. (req, res, next) => ...) or a config object.')
	},
	reset: () => {
		_handlers = []
		_endpoints = []
		resetConfig(getAppConfig())
		_preEvent = () => Promise.resolve(null)
		_postEvent = () => Promise.resolve(null)
	},
	get: (path, handler, next) => createEndpoint(path, handler, next, 'GET'),
	post: (path, handler, next) => createEndpoint(path, handler, next, 'POST'),
	put: (path, handler, next) => createEndpoint(path, handler, next, 'PUT'),
	delete: (path, handler, next) => createEndpoint(path, handler, next, 'DELETE'),
	head: (path, handler, next) => createEndpoint(path, handler, next, 'HEAD'),
	options: (path, handler, next) => createEndpoint(path, handler, next, 'OPTIONS'),
	all: (path, handler, next) => createEndpoint(path, handler, next, null),
	get preEvent() {
		return _preEvent || (() => Promise.resolve(null))
	},
	set preEvent(fn) {
		if (!fn)
			_preEvent = () => Promise.resolve(null)
		else {
			if (typeof(fn) != 'function')
				throw new Error('Wrong argument exception. A \'preEvent\' must be a function')
			_preEvent = (req, res) => Promise.resolve(null).then(() => fn(req, res))
		}
	},
	get postEvent() {
		return _postEvent || (() => Promise.resolve(null))
	},
	set postEvent(fn) {
		if (!fn)
			_postEvent = () => Promise.resolve(null)
		else {
			if (typeof(fn) != 'function')
				throw new Error('Wrong argument exception. A \'preEvent\' must be a function')
			_postEvent = (req, res) => Promise.resolve(null).then(() => fn(req, res))
		}
	},
	handleEvent: () => (req, res) => processEvent(req, res, _config, _endpoints, _handlers, _requiredResponseHeaders, _allowedOrigins, _allowedMethods, _preEvent, _postEvent),
	listen: (appName, port) => {
		const input = createListenArity(appName, port, 3000)
		const hostingType = getHostingType()
		if (!HOSTINGS[hostingType.toLowerCase()])
			throw new Error(`Unsupported hosting type '${hostingType}'`)

		const hostCategory = !hostingType || hostingType == 'localhost' || hostingType == 'now' ? 'express' : hostingType
		const notLocal = hostingType != 'localhost'
		const startMessage = notLocal
			? `Ready to receive traffic${!notLocal ? ` on port ${input.port}` : ''}`
			: `Ready to receive traffic on ${`http://localhost:${input.port}`.bold.italic}`.cyan
		const secondMsg = notLocal ? '' : 'Press Ctrl+C to stop the server'.cyan

		// Normal Express Server Setup
		if (!input.appName) {
			const __express__ = require('express')
			const __server__ = __express__()
			__server__.all('*', (req, res) => processEvent(req, res, _config, _endpoints, _handlers, _requiredResponseHeaders, _allowedOrigins, _allowedMethods, _preEvent, _postEvent))
			__server__.listen(input.port, () => { 
				console.log(startMessage)
				if (secondMsg)
					console.log(secondMsg)
			})
		}
		// Universal Serverless Setup
		else {
			switch(hostCategory) {
			case 'express': 
				return `
					const __express__ = require('express')
					const __server__ = __express__()
					__server__.all('*', ${input.appName}.handleEvent())
					__server__.listen(${input.port}, () => { console.log("${startMessage}"); ${secondMsg ? `console.log("${secondMsg}")` : ''}})
					`
			case 'gcp':
				return `exports.handler = ${input.appName}.handleEvent()`
			default:
				throw new Error(`Unsupported hosting type '${hostCategory}'`)
			}
		}
	}
}

/**
 * Gets the signature of the app.listen method. Supported arities are:
 * - (appName, port)
 * - (appName)
 * - (port)
 * - ()
 *
 * where:
 * - appName	is a string representing the app server (most likely 'app')
 * - port 		is a number describing the port where the server is listening 
 * 				to if the hosting platform is express. For FaaS, this variable 
 * 				is irrelevant.
 * 
 * @param  {String|Number} 	arg1 		Could either be appName or port
 * @param  {Number} 		arg2 		Could only be port
 * @param  {Number} 		defaultPort 
 * @return {Object}      	{ appName: ..., port: ... }
 */
const createListenArity = (arg1, arg2, defaultPort=3000) => {
	// Case 1: 2 Arguments 
	if (arg1 != undefined && arg2 != undefined) {
		if (typeof(arg1) != 'string')
			throw new Error('Wrong argument exception. When 2 arguments are passed to \'listen\', the first one must be a string.')
		if (typeof(arg2) != 'number')
			throw new Error('Wrong argument exception. When 2 arguments are passed to \'listen\', the second one must be a number.')
		return { appName: arg1, port: arg2 }
	}
	// Case 2: 1 Argument
	else if (arg1 != undefined) {
		const arg1Type = typeof(arg1)
		if (arg1Type == 'string')
			return { appName: arg1, port: defaultPort }
		else if (arg1Type == 'number')
			return { appName: null, port: arg1 }
		else
			throw new Error('Wrong argument exception. When a single argument is passed to \'listen\', it must either be a string or a number.')
	}
	else
		return { appName: null, port: defaultPort }
}

/**
 * Gets the signature for method 'createEndpoint'. Supported arities are:
 * - (path, handler, next)
 * - (path, next)
 * - (handler, next)
 * - (next)
 *
 * where:
 * - path 		is either a string or an array of strings.
 * - handler 	is a function similar to (req, res, next, params) => ... 
 * 				where next is a function, and params is an object containing all the 
 * 				req parameters from the both the query string and the body.
 * - next 		is a function similar to (req, res, params) => ...
 * 				where params is an object containing all the 
 * 				req parameters from the both the query string and the body.
 * 				
 * @param  {String|Array|Function} 	arg1 	Required argument that can either be 'path', 'handler' or 'next'
 * @param  {Function} 				arg2 	Optional argument that can either be handler' or 'next'
 * @param  {Function} 				arg3 	Optional argument 'next'
 * @return {Object}      					{ path:..., handler:..., next:... }
 */
const createEndpointArity = (arg1, arg2, arg3) => {
	if (!arg1)
		throw new Error('Missing required argument. Impossible to create an endpoint without any argument. Pass at least one function similar to (req, res) => ...')

	// Case 1: 3 Arguments
	if (arg1 != undefined && arg2 != undefined && arg3 != undefined) 
		return { path: arg1, handler: arg2, next: arg3 }
	// Case 2: 2 Arguments
	else if (arg1 != undefined && arg2 != undefined) {
		if (typeof(arg1) == 'function')
			return { path: '/', handler: arg1, next: arg2 }
		else
			return { path: arg1, handler: null, next: arg2 }
	}
	// Case 3: 1 Argument
	else 
		return { path: '/', handler: null, next: arg1 }
}

/**
 * Creates an endpoint
 * @param  {String|[String]}   	path    Requires. Path or path array.
 * @param  {Function}   		handler Optinonal. Middleware handler function similar to (req, res, next, params) => ...
 * @param  {Function} 			next    Request/Response processing function similar to (req, res, params) => ...
 * @param  {String}   			verb    Http verb
 */
const createEndpoint = (path, handler, next, verb) => {
	const input = createEndpointArity(path, handler, next)
	const pathType = typeof(input.path)
	const handlerType = typeof(input.handler)
	const nextType = typeof(input.next)

	if (pathType != 'string' && !(pathType == 'object' && input.path.length > 0))
		throw new Error('Wrong argument exception. Invalid endpoint\'s path. A valid path is either a string or an array of strings.')
	if (input.handler && handlerType != 'function')
		throw new Error('Wrong argument exception. Invalid endpoint\'s middleware handler. A handler must be a function similar to (req, res, next) => ...')
	if (nextType != 'function')
		throw new Error('Wrong argument exception. Invalid endpoint\'s next argument. \'next\' must be a function similar to (req, res, params) => ...')

	_endpoints.push({ 
		routes: getRouteDetails(input.path), 
		method: verb, 
		next: nextToPromise(input.next), 
		handler: input.handler ? handlerToPromise(input.handler) : null
	})
}

const getLongestRoute = (routes=[]) => routes.sort((a,b) => b.match.length - a.match.length)[0]

const matchEndpoint = (pathname, httpMethod, endpoints=[]) => (
	endpoints.map(e => ({ endpoint: e, routes: e.routes.map(r => matchRoute(pathname, r)).filter(r => r) }))
		.filter(e => e.routes.length > 0 && (e.endpoint.method == httpMethod || !e.endpoint.method))
		.map(e => {
			const winningRoute = getLongestRoute(e.routes)
			e.endpoint.winningRoute = winningRoute
			return { endpoint: e.endpoint, winningRoute: winningRoute }
		})
		.sort((a, b) => b.winningRoute.match.length - a.winningRoute.match.length)[0] || {}
).endpoint

const processEvent = (req, res, config={}, endpoints=[], handlers=[], requiredHeaders=[], allowedOrigins={}, allowedMethods={}, preEvent, postEvent) => {
	// 0. Create a request identity for tracing purpose
	req.__receivedTime = Date.now()
	req.__transactionId = shortid.generate().replace(/-/g, 'r').replace(/_/g, '9')
	req.__ellapsedMillis = () => Date.now() - req.__receivedTime

	// 1. Make sure the pre and post event methods exist
	if (!preEvent)
		preEvent = () => Promise.resolve(null)
	if (!postEvent)
		postEvent = () => Promise.resolve(null)

	// 2. Track errors across the workflow
	let _preEventErr, _processErr

	// 3. Prepare response with required headers and APIs
	extendResponse(res)
	setResponseHeaders(res, requiredHeaders)

	// 4. Run pre-event processing
	return preEvent(req, res)
		.catch(err => {
			console.error('Error in pre-event processing')
			console.error(err)
			try { res.status(500).send(`Internal Server Error - Pre Processing error: ${err.message}`) } catch(e) { console.error(e.message) } 
			_preEventErr = err
		})
		// 5. Run the main request/response processing 
		.then(() => {
			if (!_preEventErr) {
				// 5.1. Validate CORS
				if (!validateCORS(req, res, config, allowedOrigins, allowedMethods))
					return

				// 5.2. Stop if this is a HEAD or OPTIONS request
				const method = new String(req.method).toLowerCase()
				if (method == 'head' || method == 'options') 
					return res.status(200).send()

				// 5.3. Validate the request and make sure that there is an endpoint for it.
				const pathname = ((req._parsedUrl || {}).pathname || '/').toLowerCase()
				const httpMethod = (req.method || '').toUpperCase()

				const endpoint = matchEndpoint(pathname, httpMethod, endpoints)

				if (!endpoint) 
					return res.status(404).send(`Endpoint '${pathname}' for method ${httpMethod} not found.`)

				// 5.4. Extract all params from that request, including both the url route params and the payload params.
				const paramsMode = PARAMSMODE[config.paramsMode] ? config.paramsMode : 'all'
				const paramts = paramsMode == 'all' || paramsMode == 'route' ? Object.assign({}, endpoint.winningRoute.parameters) : {}
				const getParams = paramsMode == 'all' || paramsMode == 'body' ? reqUtil.getParams(req) : Promise.resolve({})
				return getParams.then(parameters => Object.assign(parameters, paramts))
					.then(parameters => 
						// 5.5. Process all handlers
						executeHandlers(req, res, parameters, handlers)
							// 5.6. Process endpoint handler
							.then(() => endpoint.handler ? endpoint.handler(req, res, parameters) : Promise.resolve(null))
							// 5.7. Process the endpoint next function
							.then(() => endpoint.next(req, res, parameters))
					)
			}
		})
		.catch(err => {
			console.error('Error in request/response processing')
			console.error(err)
			if (!_preEventErr)
				try { res.status(500).send(`Internal Server Error - Processing error: ${err.message}`) } catch(e) { console.error(e.message) } 
			_processErr = err
		})
		// 6. Run the final post-event processing
		.then(() => postEvent(req, res))
		.catch(err => {
			console.error('Error in post-event processing')
			console.error(err)
			if (!_preEventErr && !_processErr)
				try { res.status(500).send(`Internal Server Error - Post Processing error: ${err.message}`) } catch(e) { console.error(e.message) } 
		})
}

/**
 * The response object, depending on the hosting platform is express or a FaaS, will or will not support certain APIs.
 * This method makes sure all APIs are available
 * @param  {Object} res Response object
 */
const extendResponse = res => {
	if (!res.set)
		res.set = res.setHeader
	if (!res.send)
		res.send = (a,b,c,d,e,f,g) => {
			res.end(a,b,c,d,e,f,g)
			if (res.headersSent == undefined)
				res.headersSent = true
		}
	if (!res.status)
		res.status = code => { res.statusCode = code; return res }
}

const setResponseHeaders = (res, responseHeaders=[]) => responseHeaders.forEach(header => res.set(header.key, header.value))

const validateCORS = (req, res, config={}, allowedOrigins={}, allowedMethods={}) => {
	const noConfig = !config.headers
	const origin = new String(req.headers.origin).toLowerCase()
	const referer = new String(req.headers.referer).toLowerCase()
	const method = new String(req.method).toLowerCase()
	const sameOrigin = referer.indexOf(origin) == 0

	if (noConfig) {
		if (!sameOrigin) {
			res.status(403).send(`Forbidden - CORS issue. Origin '${origin}' is not allowed.`)
			return false
		}

		if (method != 'head' && method != 'get' && method != 'options' && method != 'post') {
			res.status(403).send(`Forbidden - CORS issue. Method '${method.toUpperCase()}' is not allowed.`)
			return false
		}
	}

	if (!allowedOrigins['*'] && Object.keys(allowedOrigins).length != 0 && !(origin in allowedOrigins)) {
		res.status(403).send(`Forbidden - CORS issue. Origin '${origin}' is not allowed.`)
		return false
	}

	if (Object.keys(allowedMethods).length != 0 && method != 'get' && method != 'head' && !(method in allowedMethods)) {
		res.status(403).send(`Forbidden - CORS issue. Method '${method.toUpperCase()}' is not allowed.`)
		return false
	}

	return true
}

module.exports = {
	app,
	utils: {
		headers: {
			setResponseHeaders,
			getRequiredResponseHeaders
		}
	}
}

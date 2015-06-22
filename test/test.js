var assert = require('assert')
var storeFactory = require('../storeFactory')
var Dispatcher = require('flux').Dispatcher

var store
var dispatcher

var testThings;

var actionCreators = {
	createThing: function(obj) {
		dispatcher.dispatch({
			actionType: 'THING_CREATE',
			thing: obj
		})
	},
	destroyThing: function(obj) {
		dispatcher.dispatch({
			actionType: 'THING_DESTROY',
			thing: obj
		})
	},
	purgeThings: function(obj) {
		dispatcher.dispatch({
			actionType: 'THING_PURGE',
			thing: obj
		})
	},
}


suite('store factory', function () {
	setup(function () {
		testThings = [
			{thing_id: 1, name: 'Z', group: 'A', label: 'Zac'},
			{thing_id: 2, name: 'D', group: 'B', label: 'David'},
			{thing_id: 3, name: 'E', group: 'A', label: 'Ethan'},
			{thing_id: 4, name: 'A', group: 'B', label: 'Alan'},
			{thing_id: 5, name: 'F', group: 'B', label: 'Frank'},
			{name: 'M', group: 'B'}
		]

		dispatcher = new Dispatcher()
		store = storeFactory({
			identifier: 'thing_id',
			dispatcher: dispatcher,
			pivot: function (payload) {
				switch (payload.actionType) {
					case 'THING_CREATE':
				    	this.create(payload.thing)
				    	this.emitChange()
				    	break;

				    case 'THING_DESTROY':
				    	this.destroy(payload.thing)
				    	this.emitChange()
				    	break;

				    case 'THING_PURGE':
				    	this.purge(payload.thing)
				    	this.emitChange()
				    	break;
				}
			}
		})
	})
	
	teardown(function () {
		store = null
		dispatcher = null
	})

	test('store should listen to dispatches, add values, and return by id', function () {
		var thing = {
			thing_id: 1,
			name: 'It',
			age: 25
		}
		dispatcher.dispatch({
			actionType: 'THING_CREATE',
			thing: thing
		})
		assert.deepEqual(store.get(1), thing)
	})

	suite('query()', function () {
		setup(function () {
			testThings.map(actionCreators.createThing)
		})

		test('should work with filter and sort', function () {
			var results = store.query({group: 'B'},['name'])
			var names = results.map(function(r) {return r.name})
			assert.deepEqual(names, ['A','D','F','M'])
		})

		test('should work with filter but no sort', function () {
			var results = store.query({group: 'A'}, null)
			assert.deepEqual(results.length, 2)
		})

		test('should work with sort but no filter', function () {
			var results = store.query(null,['name'])
			var names = results.map(function(r) {return r.name})
			assert.deepEqual(names, ['A','D','E','F','M','Z'])
		})

		test('should work with lte filter', function () {
			var results = store.query({thing_id: 'lte.3'}, 'name')
			var names = results.map(function(r) {return r.name})
			assert.deepEqual(names, ['D','E','Z'])
		})

		test('should work with gt filter with float typecast', function () {
			var results = store.query({thing_id: 'gt.3'}, 'name')
			var names = results.map(function(r) {return r.name})
			assert.deepEqual(names, ['A','F'])
		})

		test('should work with contains filter', function () {
			var results = store.query({label: 'contains.n'}, 'name')
			var names = results.map(function(r) {return r.name})
			assert.deepEqual(names, ['A','E','F'])
		})

		test('should work with startswith filter', function () {
			var results = store.query({label: 'startswith.d'}, 'name')
			var names = results.map(function(r) {return r.name})
			assert.deepEqual(names, ['D'])
		})
	})

	test('create(): should convert cids to ids in the _byId index', function () {
		var newThing = {name: 'M', group: 'B'}
		var results
		
		actionCreators.createThing(newThing)
		newThing.thing_id = 47;
		actionCreators.createThing(newThing)

		results = store.query(null,['name'])
		assert.equal(results.length, 1)
	})


	suite('destroy()', function () {
		setup(function () {
			testThings.map(actionCreators.createThing)
		})

		test('should forget an unsaved object', function () {
			var results
			var names
			var newThing
			
			// create a new thing locally		
			newThing = {name: 'Q', group: 'B'}
			actionCreators.createThing(newThing)
			actionCreators.createThing(newThing)
			results = store.query(null, ['name'])
			names = results.map(function(r) {return r.name})
			assert.deepEqual(names, ['A','D','E','F','M','Q','Z'])

			// commit to the server and get an id
			newThing.thing_id = 98;
			actionCreators.createThing(newThing)
			results = store.query(null, ['name'])
			names = results.map(function(r) {return r.name})
			assert.deepEqual(names, ['A','D','E','F','M','Q','Z'])

			// now destroy it
			actionCreators.destroyThing(newThing)
			results = store.query(null, ['name'])
			names = results.map(function(r) {return r.name})
			assert.deepEqual(names, ['A','D','E','F','M','Z'])
		})

		test('should forget a saved object', function () {
			var results
			var names
			var newThing

			// create a new thing locally	
			newThing = {name: 'Q', group: 'B'}
			actionCreators.createThing(newThing)
			results = store.query(null, ['name'])
			names = results.map(function(r) {return r.name})
			assert.deepEqual(names, ['A','D','E','F','M','Q','Z'])

			// now destroy it before it is comitted
			actionCreators.destroyThing(newThing)
			results = store.query(null, ['name'])
			names = results.map(function(r) {return r.name})
			assert.deepEqual(names, ['A','D','E','F','M','Z'])
		})
	})

	test('purge(): should destroy all objects matching selector', function () {
		var results
		var names
		var newThing

		testThings.map(actionCreators.createThing)

		actionCreators.purgeThings({group: 'B'})
		results = store.query(null, ['name'])
		names = results.map(function(r) {return r.name})
		assert.deepEqual(names, ['E','Z'])	

	})

})
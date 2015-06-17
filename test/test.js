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
}


suite('Basic store functionality', function () {
	setup(function () {
		testThings = [
			{thing_id: 1, name: 'Z', group: 'A'},
			{thing_id: 2, name: 'D', group: 'B'},
			{thing_id: 3, name: 'E', group: 'A'},
			{thing_id: 4, name: 'A', group: 'B'},
			{thing_id: 5, name: 'F', group: 'B'},
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
				}
			}
		})
	})
	
	teardown(function () {
		store = null
		dispatcher = null
	})

	test(' should listen to dispatches, add values, and return by id', function () {
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

	test(' should enable query with filter and sort', function () {

		testThings.map(actionCreators.createThing)

		var results = store.query({group: 'B'},['name'])
		var names = results.map(function(r) {return r.name})
		assert.deepEqual(names, ['A','D','F','M'])
	})

	test(' should enable query with filter but no sort', function () {
		
		testThings.map(actionCreators.createThing)

		var results = store.query({group: 'A'}, null)
		assert.deepEqual(results.length, 2)
	})

	test(' should enable query with sort but no filter', function () {
		var names
		var results 

		testThings.map(actionCreators.createThing)

		results = store.query(null,['name'])
		names = results.map(function(r) {return r.name})
		assert.deepEqual(names, ['A','D','E','F','M','Z'])
	})

	test(' should convert cids to ids eventually', function () {
		var newThing = {name: 'M', group: 'B'}
		var results
		
		actionCreators.createThing(newThing)
		newThing.thing_id = 47;
		actionCreators.createThing(newThing)

		results = store.query(null,['name'])
		assert.equal(results.length, 1)
	})

	test(' should handle destroy ', function () {
		var results
		var names
		var oldThing
		var newThing

		testThings.map(actionCreators.createThing)

		oldThing = {thing_id: 34, name: 'R', group: 'B'}
		actionCreators.createThing(oldThing)

		newThing = {name: 'Q', group: 'B'}
		actionCreators.createThing(newThing)
		newThing.thing_id = 98;
		actionCreators.createThing(newThing)

		results = store.query(null, ['name'])
		names = results.map(function(r) {return r.name})
		assert.deepEqual(names, ['A','D','E','F','M','Q','R','Z'])

		actionCreators.destroyThing(newThing)
		actionCreators.destroyThing(oldThing)

		results = store.query(null, ['name'])
		names = results.map(function(r) {return r.name})
		assert.deepEqual(names, ['A','D','E','F','M','Z'])
	})

})
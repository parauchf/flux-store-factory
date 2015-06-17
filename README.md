# flux-store-factory
This is a simple module to generate generic flux stores. Someone has probably done this better...  I found myself re-writing the same code for all of my stores so I created this library to keep things DRY.

The pivot method and dispatcher are passed as parameters.  The pivot method is bound to a data access object so that the store's private elements can be accessed through "this."  Specifically, `create` and `destroy` accept an identifier and can create, update or delete objects from the store.

The store exposes two methods to access the data in the store:

 - `get`: fetches a single object by its identifier (or cid)

 - `fetch`: takes a `filter` parameter and a `sort` parameter.  Filter is a hash of conditions that should be met (only equality is supported) and sort is an array of attributes by which to sort.

A typical implementation might look something like this:

```javascript
var storeFactory = require('../storeFactory')
var myDispatcher = require('./path/to/dispatcher')

module.exports.ThingStore = storeFactory({
	identifier: 'thing_id',
	dispatcher: myDispatcher,
	pivot: function (payload) {
		switch (payload.actionType) {
			case 'THING_CREATE':
		    	this.create(payload.thing)
		    	this.emitChange()
		    	break

		    case 'THING_DESTROY':
		    	this.destroy(payload.thing)
		    	this.emitChange()
		    	break
		}
	}
})
```
var assign  = require('object-assign')
var EventEmitter  = require('events').EventEmitter


// utility to get values of an associative array
var vals = function (obj) {
  return Object.keys(obj).map(function (key) {
    return obj[key]
  })
}

// clone for simple objects -- references should be avoided 
var clone = function (obj) {
  if (!(obj instanceof Object)) return obj
  return JSON.parse(
    JSON.stringify(obj)
  )
}

var _makeSortFunc = function (sortSpec) {
  return function (a, b) {
    for (var i = 0; i <  sortSpec.length; i++) {
      var el = sortSpec[i]
      if (a[el] > b[el]) return 1
      else if (a[el] < b[el]) return -1
    }
    return 0
  }
}

var _makeFilterFunc = function (filterSpec) {
  var rx = /^((eq|gt|lt|gte|lte|neq|contains|startswith)\.)?(.*)?/i
  var tests = Object.keys(filterSpec).map(function (key) {

    var rxResult = rx.exec(filterSpec[key])
    var comparator = rxResult[2]
    var ref = rxResult[3]

    switch(comparator) {
      case 'gt':
        return function (obj) {return obj[key] > ref}
        break;
      case 'lt':
        return function (obj) {return obj[key] < ref}
        break;
      case 'gte':
        return function (obj) {return obj[key] >= ref}
        break;
      case 'lte':
        return function (obj) {return obj[key] <= ref}
        break;
      case 'neq':
        return function (obj) {return obj[key] != ref}
        break;
      case 'startswith':
        return function (obj) {
          var val = obj[key]
          if (!val) return false
          return String(val.toLowerCase()).indexOf(ref) == 0
        }
        break;
      case 'contains':
        return function (obj) {
          var val = obj[key]
          if (!val) return false
          return String(val.toLowerCase()).indexOf(ref) > 0
        }
        break;
      case 'eq':
      default:
        return function (obj) {return obj[key] == ref}
        break;
    }
  })
  
  

  return function (obj) {
    return tests.every(function(test) {return test(obj)})
  }
}

var storeFactory = module.exports = function (options) {
  options = options || {}
  var identifier = options.identifier || 'id'

  // internal indexes
  var _byId = {}
  var _byCid = {}
  var _sequence = 0

  var store

  // data access object--this gets bound to the pivot method as this so that
  //  these methods can be accessed within the switch statement
  var dao = {

    // create (or update)
    create: function (obj) {
      if (obj[identifier]) {
        if (obj.cid) delete _byId[obj.cid]
        _byId[obj[identifier]] = obj
      } 
      else {
        if (!obj.cid) obj.cid = 'c' + (options.guidGenerator ? options.guidGenerator() : _sequence++)
        _byId[obj.cid] = obj
      }
      if (obj.cid) {
        _byCid[obj.cid] = obj
      }
      store.emit('CREATE_EVENT', obj)
    },

    // forget about all records matching this selector
    // @selector: a selector (a dictionary of conditions like used in query) of items
    purge: function (selector) {
      store.query(selector).map(this.destroy.bind(this))
    },

    // forget aobut this record
    // @obj: the object to forget about (i.e. remove from the store)
    destroy: function (obj) {
      obj = this.get(obj instanceof Object ? (obj.cid || obj[identifier]) : obj)
      if (!obj) return undefined
      delete _byId[obj[identifier]]
      delete _byId[obj.cid]
      delete _byCid[obj.cid]
      store.emit('DESTROY_EVENT', obj)
    },

    emitChange: function () {
      store.emit('CHANGE_EVENT')
    },

    // @param id: either an identifier or a cid.  Assuming identifiers are numeric (so they don't start with c)
    get: function (id) {
      return /^c\d+/.test(id) ? _byCid[id] : _byId[id]
    },

    // @param filter: a dictionary of qualifiers to filter with
    // @param sort: a list of columns to sort by -- ascending only for now!
    query: function (filter, sort) {
      sort = sort || [identifier]
      if (sort instanceof Array) sort = _makeSortFunc(sort)
      else if (sort instanceof Function) sort = sort
      else sort = _makeSortFunc([sort])

      if (filter instanceof Function) filter = filter
      else if (filter instanceof Object) filter = _makeFilterFunc(filter)
      else if (!filter) filter = function () {return true}

      return vals(_byId).filter(filter).sort(sort)
    },

  }

  store = assign({}, EventEmitter.prototype, {

    get: dao.get,

    query: dao.query,

    addChangeListener: function (callback) {
      this.on('CHANGE_EVENT', callback)
    },

    removeChangeListener: function (callback) {
      this.removeListener('CHANGE_EVENT', callback)
    },

    addCreateListener: function (callback) {
      this.on('CREATE_EVENT', callback)
    },

    removeCreateListener: function (callback) {
      this.removeListener('CREATE_EVENT', callback)
    },

    addDestroyListener: function (callback) {
      this.on('DESTROY_EVENT', callback)
    },

    removeDestroyListener: function (callback) {
      this.removeListener('DESTROY_EVENT', callback)
    },

    unregister: function () {
      options.dispatcher.unregister(this.dispatchToken)
      delete this.dispatchToken
    },

    register: function () {
      if (this.dispatchToken) return
      this.dispatchToken = options.dispatcher.register(options.pivot.bind(dao))
    }

  });

  store.register();
  
  return store;
}
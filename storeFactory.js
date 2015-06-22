var assign  = require('object-assign')
var EventEmitter  = require('events').EventEmitter

// simple utility and-all reducer
var and = function (a, b) {
  return a && b
}

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

var storeFactory = module.exports = function (options) {
  options = options || {}
  
  var identifier = options.identifier || 'id'

  // internal indexes
  var _byId = {}
  var _byCid = {}
  var _sequence = 0

  var store

  var dao = {

    // create (or update)
    create: function (obj) {
      if (obj[identifier]) {
        if (obj.cid) delete _byId[obj.cid]
        _byId[obj[identifier]] = obj
      } 
      else {
        if (!obj.cid) obj.cid = ('c' + _sequence++)
        _byId[obj.cid] = obj
      }
      if (obj.cid) {
        _byCid[obj.cid] = obj
      }
    },

    receive: function (obj) {
      obj._old = clone(obj)
    },

    purge: function (obj) {
      store.query(obj).map(this.destroy)
    },

    // forget aobut this record
    destroy: function (obj) {
      delete _byId[obj[identifier]]
      delete _byId[obj.cid]
      delete _byCid[obj.cid]
    },

    emitChange: function () {
      store.emitChange()
    }

  }

  store = assign({}, EventEmitter.prototype, {
  
    // @param id: either an identifier or a cid.  Assuming identifiers are numeric (so they don't start with c)
    get: function (id) {
      return  clone(
        (/^c\d+/.test(id)) ? _byCid[id] : _byId[id]
      )
    },

    // @param filter: a dictionary of qualifiers to filter with
    // @param sort: a list of columns to sort by -- ascending only for now!
    query: function (filter, sort) {
      var rx = /^((eq|gt|lt|gte|lte|neq|contains|startswith)\.)?(.+)$/i

      sort = sort || [identifier]
      if (!(sort instanceof Array)) sort = [sort]
      return vals(_byId).filter(function (obj) {
        if (filter) return Object.keys(filter).map(function (key) {
          var rxResult = rx.exec(filter[key])
          var comparator = rxResult[2]
          var ref = rxResult[3]
          var val = obj[key]
          
          switch(comparator) {
            case 'eq':
              return val == ref
              break;
            case 'gt':
              return val > ref
              break;
            case 'lt':
              return val < ref
              break;
            case 'gte':
              return val >= ref
              break;
            case 'lte':
              return val <= ref
              break;
            case 'neq':
              return val != ref
              break;
            case 'startswith':
              if (!val) return false;
              return String(val.toLowerCase()).indexOf(ref) == 0
              break;
            case 'contains':
              if (!val) return false;
              return String(val.toLowerCase()).indexOf(ref) > 0
              break;
            default:
              return val == ref
              break;
          }
        }).reduce(and, true)
        else return true
      }).sort(function (a, b) {
        for(var i = 0; i <  sort.length; i++) {
          var el = sort[i]
          if (a[el] > b[el]) return 1
          else if (a[el] < b[el]) return -1
        }
        return 0
      }).map(clone)
    },

    emitChange: function () {
      this.emit('CHANGE_EVENT')
    },

    addChangeListener: function (callback) {
      this.on('CHANGE_EVENT', callback)
    },

    removeChangeListener: function (callback) {
      this.removeListener('CHANGE_EVENT', callback)
    },

    dispatchToken: options.dispatcher.register (
        options.pivot.bind(dao)
    )

  })
  
  return store
}


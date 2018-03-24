const Vector3D = require('./Vector3')
const Vertex = require('./Vertex3')
const Matrix4x4 = require('./Matrix4')
const {_CSGDEBUG, EPS, getTag} = require('../constants')

/** Class Polygon3
 * Represents a convex polygon. The vertices used to initialize a polygon must
 *   be coplanar and form a convex loop. They do not have to be `Vertex`
 *   instances but they must behave similarly (duck typing can be used for
 *   customization).
 * <br>
 * Each convex polygon has a `shared` property, which is shared between all
 *   polygons that are clones of each other or were split from the same polygon.
 *   This can be used to define per-polygon properties (such as surface color).
 * <br>
 * The plane of the polygon is calculated from the vertex coordinates if not provided.
 *   The plane can alternatively be passed as the third argument to avoid calculations.
 *
 * @constructor
 * @param {Vertex[]} vertices - list of vertices
 * @param {Polygon3.Shared} [shared=defaultShared] - shared property to apply
 * @param {Plane} [plane] - plane of the polygon
 *
 * @example
 * const vertices = [
 *   new CSG.Vertex(new CSG.Vector3D([0, 0, 0])),
 *   new CSG.Vertex(new CSG.Vector3D([0, 10, 0])),
 *   new CSG.Vertex(new CSG.Vector3D([0, 10, 10]))
 * ]
 * let observed = new Polygon3(vertices)
 */
let Polygon3 = function (vertices, shared, plane) {
  this.vertices = vertices
  if (!shared) shared = Polygon3.defaultShared
  this.shared = shared
    // let numvertices = vertices.length;

  if (arguments.length >= 3) {
    this.plane = plane
  } else {
    const Plane = require('./Plane') // FIXME: circular dependencies ???
    this.plane = Plane.fromVector3Ds(vertices[0].pos, vertices[1].pos, vertices[2].pos)
  }

  if (_CSGDEBUG) {
    if (!this.checkIfConvex()) {
      throw new Error('Not convex!')
    }
  }
}

Polygon3.prototype = {
  /** Check whether the polygon is convex. (it should be, otherwise we will get unexpected results)
   * @returns {boolean}
   */
  checkIfConvex: function () {
    return Polygon3.verticesConvex(this.vertices, this.plane.normal)
  },

  // FIXME what? why does this return this, and not a new polygon?
  // FIXME is this used?
  setColor: function (args) {
    let newshared = Polygon3.Shared.fromColor.apply(this, arguments)
    this.shared = newshared
    return this
  },

  getSignedVolume: function () {
    let signedVolume = 0
    for (let i = 0; i < this.vertices.length - 2; i++) {
      signedVolume += this.vertices[0].pos.dot(this.vertices[i + 1].pos
                .cross(this.vertices[i + 2].pos))
    }
    signedVolume /= 6
    return signedVolume
  },

    // Note: could calculate vectors only once to speed up
  getArea: function () {
    let polygonArea = 0
    for (let i = 0; i < this.vertices.length - 2; i++) {
      polygonArea += this.vertices[i + 1].pos.minus(this.vertices[0].pos)
                .cross(this.vertices[i + 2].pos.minus(this.vertices[i + 1].pos)).length()
    }
    polygonArea /= 2
    return polygonArea
  },

    // accepts array of features to calculate
    // returns array of results
  getTetraFeatures: function (features) {
    let result = []
    features.forEach(function (feature) {
      if (feature === 'volume') {
        result.push(this.getSignedVolume())
      } else if (feature === 'area') {
        result.push(this.getArea())
      }
    }, this)
    return result
  },

  translate: function (offset) {
    return this.transform(Matrix4x4.translation(offset))
  },

    // returns an array with a Vector3D (center point) and a radius
  boundingSphere: function () {
    if (!this.cachedBoundingSphere) {
      let box = this.boundingBox()
      let middle = box[0].plus(box[1]).times(0.5)
      let radius3 = box[1].minus(middle)
      let radius = radius3.length()
      this.cachedBoundingSphere = [middle, radius]
    }
    return this.cachedBoundingSphere
  },

    // returns an array of two Vector3Ds (minimum coordinates and maximum coordinates)
  boundingBox: function () {
    if (!this.cachedBoundingBox) {
      let minpoint, maxpoint
      let vertices = this.vertices
      let numvertices = vertices.length
      if (numvertices === 0) {
        minpoint = new Vector3D(0, 0, 0)
      } else {
        minpoint = vertices[0].pos
      }
      maxpoint = minpoint
      for (let i = 1; i < numvertices; i++) {
        let point = vertices[i].pos
        minpoint = minpoint.min(point)
        maxpoint = maxpoint.max(point)
      }
      this.cachedBoundingBox = [minpoint, maxpoint]
    }
    return this.cachedBoundingBox
  },

  flipped: function () {
    let newvertices = this.vertices.map(function (v) {
      return v.flipped()
    })
    newvertices.reverse()
    let newplane = this.plane.flipped()
    return new Polygon3(newvertices, this.shared, newplane)
  },

    // Affine transformation of polygon. Returns a new Polygon3
  transform: function (matrix4x4) {
    let newvertices = this.vertices.map(function (v) {
      return v.transform(matrix4x4)
    })
    let newplane = this.plane.transform(matrix4x4)
    if (matrix4x4.isMirroring()) {
            // need to reverse the vertex order
            // in order to preserve the inside/outside orientation:
      newvertices.reverse()
    }
    return new Polygon3(newvertices, this.shared, newplane)
  },

  toString: function () {
    let result = 'Polygon3 plane: ' + this.plane.toString() + '\n'
    this.vertices.map(function (vertex) {
      result += '  ' + vertex.toString() + '\n'
    })
    return result
  }
}

// create from an untyped object with identical property names:
Polygon3.fromObject = function (obj) {
  const Plane = require('./Plane') // FIXME: circular dependencies
  let vertices = obj.vertices.map(function (v) {
    return Vertex.fromObject(v)
  })
  let shared = Polygon3.Shared.fromObject(obj.shared)
  let plane = Plane.fromObject(obj.plane)
  return new Polygon3(vertices, shared, plane)
}

/** Create a polygon from the given points.
 *
 * @param {Array[]} points - list of points
 * @param {Polygon3.Shared} [shared=defaultShared] - shared property to apply
 * @param {Plane} [plane] - plane of the polygon
 *
 * @example
 * const points = [
 *   [0,  0, 0],
 *   [0, 10, 0],
 *   [0, 10, 10]
 * ]
 * let observed = CSG.Polygon3.createFromPoints(points)
 */
Polygon3.createFromPoints = function (points, shared, plane) {
  // FIXME : this circular dependency does not work !
  // const {fromPoints} = require('./polygon3Factories')
  // return fromPoints(points, shared, plane)
  let vertices = []
  points.map(function (p) {
    let vec = new Vector3D(p)
    let vertex = new Vertex(vec)
    vertices.push(vertex)
  })
  let polygon
  if (arguments.length < 3) {
    polygon = new Polygon3(vertices, shared)
  } else {
    polygon = new Polygon3(vertices, shared, plane)
  }
  return polygon
}

Polygon3.verticesConvex = function (vertices, planenormal) {
  let numvertices = vertices.length
  if (numvertices > 2) {
    let prevprevpos = vertices[numvertices - 2].pos
    let prevpos = vertices[numvertices - 1].pos
    for (let i = 0; i < numvertices; i++) {
      let pos = vertices[i].pos
      if (!Polygon3.isConvexPoint(prevprevpos, prevpos, pos, planenormal)) {
        return false
      }
      prevprevpos = prevpos
      prevpos = pos
    }
  }
  return true
}

// calculate whether three points form a convex corner
//  prevpoint, point, nextpoint: the 3 coordinates (Vector3D instances)
//  normal: the normal vector of the plane
Polygon3.isConvexPoint = function (prevpoint, point, nextpoint, normal) {
  let crossproduct = point.minus(prevpoint).cross(nextpoint.minus(point))
  let crossdotnormal = crossproduct.dot(normal)
  return (crossdotnormal >= 0)
}

Polygon3.isStrictlyConvexPoint = function (prevpoint, point, nextpoint, normal) {
  let crossproduct = point.minus(prevpoint).cross(nextpoint.minus(point))
  let crossdotnormal = crossproduct.dot(normal)
  return (crossdotnormal >= EPS)
}

/** Class Polygon3.Shared
 * Holds the shared properties for each polygon (Currently only color).
 * @constructor
 * @param {Array[]} color - array containing RGBA values, or null
 *
 * @example
 *   let shared = new CSG.Polygon3.Shared([0, 0, 0, 1])
 */
Polygon3.Shared = function (color) {
  if (color !== null && color !== undefined) {
    if (color.length !== 4) {
      throw new Error('Expecting 4 element array')
    }
  }
  this.color = color
}

Polygon3.Shared.fromObject = function (obj) {
  return new Polygon3.Shared(obj.color)
}

/** Create Polygon3.Shared from color values.
 * @param {number} r - value of RED component
 * @param {number} g - value of GREEN component
 * @param {number} b - value of BLUE component
 * @param {number} [a] - value of ALPHA component
 * @param {Array[]} [color] - OR array containing RGB values (optional Alpha)
 *
 * @example
 * let s1 = Polygon3.Shared.fromColor(0,0,0)
 * let s2 = Polygon3.Shared.fromColor([0,0,0,1])
 */
Polygon3.Shared.fromColor = function (args) {
  let color
  if (arguments.length === 1) {
    color = arguments[0].slice() // make deep copy
  } else {
    color = []
    for (let i = 0; i < arguments.length; i++) {
      color.push(arguments[i])
    }
  }
  if (color.length === 3) {
    color.push(1)
  } else if (color.length !== 4) {
    throw new Error('setColor expects either an array with 3 or 4 elements, or 3 or 4 parameters.')
  }
  return new Polygon3.Shared(color)
}

Polygon3.Shared.prototype = {
  getTag: function () {
    let result = this.tag
    if (!result) {
      result = getTag()
      this.tag = result
    }
    return result
  },
    // get a string uniquely identifying this object
  getHash: function () {
    if (!this.color) return 'null'
    return this.color.join('/')
  }
}

Polygon3.defaultShared = new Polygon3.Shared(null)

module.exports = Polygon3

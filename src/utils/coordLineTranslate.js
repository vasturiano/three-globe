
import {
  Vector3
} from 'three';

const THREE = window.THREE
  ? window.THREE // Prefer consumption from global THREE, if exists
  : {
  Vector3
};

export default function createLineGeometry(geometry, coords, radius, altitude) {
  var x_values = [];
  var y_values = [];
  var z_values = [];

  function createCoordinateArray(feature) {
    //Loop through the coordinates and figure out if the points need interpolation.
    var temp_array = [];
    var interpolation_array = [];

    for (var point_num = 0; point_num < feature.length; point_num++) {
      var point1 = feature[point_num];
      var point2 = feature[point_num - 1];

      if (point_num > 0) {
        if (needsInterpolation(point2, point1)) {
          interpolation_array = [point2, point1];
          interpolation_array = interpolatePoints(interpolation_array);

          for (var inter_point_num = 0; inter_point_num < interpolation_array.length; inter_point_num++) {
            temp_array.push(interpolation_array[inter_point_num]);
          }
        } else {
          temp_array.push(point1);
        }
      } else {
        temp_array.push(point1);
      }
    }

    return temp_array;
  }

  function needsInterpolation(point2, point1) {
    //If the distance between two latitude and longitude values is
    //greater than five degrees, return true.
    var lon1 = point1[0];
    var lat1 = point1[1];
    var lon2 = point2[0];
    var lat2 = point2[1];
    var lon_distance = Math.abs(lon1 - lon2);
    var lat_distance = Math.abs(lat1 - lat2);

    if (lon_distance > 5 || lat_distance > 5) {
      return true;
    } else {
      return false;
    }
  }

  function interpolatePoints(interpolation_array) {
    //This function is recursive. It will continue to add midpoints to the
    //interpolation array until needsInterpolation() returns false.
    var temp_array = [];
    var point1, point2;

    for (var point_num = 0; point_num < interpolation_array.length - 1; point_num++) {
      point1 = interpolation_array[point_num];
      point2 = interpolation_array[point_num + 1];

      if (needsInterpolation(point2, point1)) {
        temp_array.push(point1);
        temp_array.push(getMidpoint(point1, point2));
      } else {
        temp_array.push(point1);
      }
    }

    temp_array.push(interpolation_array[interpolation_array.length - 1]);

    if (temp_array.length > interpolation_array.length) {
      temp_array = interpolatePoints(temp_array);
    } else {
      return temp_array;
    }

    return temp_array;
  }

  function getMidpoint(point1, point2) {
    var midpoint_lon = (point1[0] + point2[0]) / 2;
    var midpoint_lat = (point1[1] + point2[1]) / 2;
    var midpoint = [midpoint_lon, midpoint_lat];
    return midpoint;
  }

  function convertToSphereCoords(coordinates_array, sphere_radius) {
    var phi = (90 - coordinates_array[1]) * Math.PI / 180;
    var theta = (90 - coordinates_array[0]) * Math.PI / 180;

    x_values.push(Math.sin(phi) * Math.cos(theta) * sphere_radius);
    y_values.push(Math.cos(phi) * sphere_radius);
    z_values.push(Math.sin(phi) * Math.sin(theta) * sphere_radius);
  }

  var coordinatesArray = createCoordinateArray(coords)[0];

  for (var point_num = 0; point_num < coordinatesArray.length; point_num++) {
    convertToSphereCoords(coordinatesArray[point_num], radius * (1 + altitude));
  }

  for (var i = 0; i < x_values.length; i++) {
    geometry.vertices.push(new THREE.Vector3(x_values[i], y_values[i], z_values[i]));
  }
}

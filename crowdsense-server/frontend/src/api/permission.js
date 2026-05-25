import request from '../utils/request'

export function getPermissionList(params) {
  return request({ url: '/permissions', method: 'get', params })
}
export function getPermissionById(id) {
  return request({ url: '/permissions/' + id, method: 'get' })
}
export function createPermission(data) {
  return request({ url: '/permissions', method: 'post', data })
}
export function updatePermission(id, data) {
  return request({ url: '/permissions/' + id, method: 'put', data })
}
export function deletePermission(id) {
  return request({ url: '/permissions/' + id, method: 'delete' })
}

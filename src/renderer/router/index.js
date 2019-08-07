import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/setting',
      name: 'setting',
      component: require('@/components/setting').default
    },
    {
      path: '/desktop',
      name: 'desktop',
      component: require('@/components/desktop').default
    }
  ]
})

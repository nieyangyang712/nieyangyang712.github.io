export function init() {
  return new Promise((resolve, reject) => {
    if (typeof requirejs == 'undefined') {
      let script = document.createElement('script');
      script.type = 'text/javascript';
      script.onload = () => {
        // requirejs加载完成

        requirejs(['js/ws/config.js'], function () {
          requirejs(['index/index'], function (index1) {
            console.log('have not', index1)
            resolve(index1)
          })
        })
      };
      script.onerror = () => {};
      script.src = `${process.env.BASE_URL}js/ws/lib/require.min.js`;
      document.getElementsByTagName('body')[0].appendChild(script);
    } else {
      requirejs(['js/ws/config.js'], function () {
        requirejs(['index/index'], function (index1) {
          console.log('have', index1)
          resolve(index1)
        })
      })
    }
  });

}
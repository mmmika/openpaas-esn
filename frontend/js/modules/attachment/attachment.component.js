(function() {
  'use strict';

  angular.module('esn.attachment')
    .component('esnAttachment', {
      bindings: {
        attachment: '<',
        gallery: '<',
        preview: '<',
        viewer: '<'
      },
      controller: 'ESNAttachmentController',
      templateUrl: '/views/modules/attachment/attachment.html'
    });
})();

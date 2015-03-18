var micControllers = angular.module('micControllers', []);

micControllers.controller('IndexControl', ['$scope', function($scope) {

  $scope.logger = function() {
    console.log('hi');
  };

}]);

micControllers.controller('MainControl', ['$scope', '$location', 'Room', function($scope, $location, Room) {
  $scope.data = [];

  $scope.createRoom = function(room) {
    var successCb = function(result) {
      console.log(result);
      $location.url('/presenter');
    };

    var errorCb = function(err) {
      console.error(err);
      $location.url('/main');
    };

    var notifyCb = function(result) {
      console.log(result);
    };

    room = room || 'testRoom';
    // $location.url('/presenter');
    var roomCheck = Room.tryToMakeRoom(room);
    
    console.log(roomCheck);
    
    roomCheck
      .catch(function(err) {
        console.error(err);
      })
      .then(successCb, errorCb, notifyCb);
    
    console.log('let\'s create a room!');
  };

  $scope.joinRoom = function(room) {

    var successCb = function(result) {
      console.log(result);
      $location.url('/audience');
    };

    var errorCb = function(err) {
      console.error(err);
      $location.url('/main');
    };

    var notifyCb = function(result) {
      console.log(result);
    };

    // Send in the roomname to allow the server to check if the room exists.
    // If it does, the server will respond by sending back an object or string
    // that will show who the presenter for the room is.
    // We will use the presenter string/object to tell the audienceRTC who to
    // connect to.

    var returnPresenter = Room.returnPresenter(room); 
    console.log(returnPresenter);
    returnPresenter
      .catch(function(err) {
        console.error(err);
      })
      .then(successCb, errorCb, notifyCb);

    $location.url('/audience');
    console.log('let\'s join a room!', room);
    // Room.joinRoom(room);
  };

}]);

micControllers.controller('AudienceControl', ['$scope', function($scope) {
  $scope.toggle = function() {
    console.log("toggle");
  };
}]);
  
micControllers.controller('PresenterControl', ['$scope', function($scope) {
  $scope.users = [{'name': 'hey'}, {'name': 'bye'}, {'name': 'sigh'}];
  $scope.mute = function(speaker) {
    console.log('mute function responds', speaker)
  };
}]);
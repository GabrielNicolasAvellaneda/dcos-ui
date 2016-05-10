jest.dontMock('../../constants/HealthLabels');
jest.dontMock('../../mixins/GetSetMixin');
jest.dontMock('../MarathonStore');
jest.dontMock('../../constants/EventTypes');
jest.dontMock('./fixtures/MockAppMetadata');
jest.dontMock('./fixtures/MockMarathonResponse.json');
jest.dontMock('../../structs/DeploymentsList');

import DeploymentsList from '../../structs/DeploymentsList';
import EventTypes from '../../constants/EventTypes';
var HealthLabels = require('../../constants/HealthLabels');
var HealthTypes = require('../../constants/HealthTypes');
var MarathonStore = require('../MarathonStore');
var MockAppMetadata = require('./fixtures/MockAppMetadata');
var MockMarathonResponse = require('./fixtures/MockMarathonResponse.json');

// mock global string decoder
global.atob = function () {
  return MockAppMetadata.decodedString;
};

describe('MarathonStore', function () {

  describe('#getFrameworkHealth', function () {

    it('should return NA health when app has no health check', function () {
      var health = MarathonStore.getFrameworkHealth(
        MockMarathonResponse.hasNoHealthy.apps[0]
      );
      expect(health).not.toEqual(null);
      expect(health.key).toEqual('NA');
      expect(health.value).toEqual(HealthTypes.NA);
    });

    it('should return idle when app has no running tasks', function () {
      var health = MarathonStore.getFrameworkHealth(
        MockMarathonResponse.hasNoRunningTasks.apps[0]
      );
      expect(health.key).toEqual('IDLE');
    });

    it('should return unhealthy when app has only unhealthy tasks',
      function () {
        var health = MarathonStore.getFrameworkHealth(
          MockMarathonResponse.hasOnlyUnhealth.apps[0]
        );
        expect(health.key).toEqual('UNHEALTHY');
      }
    );

    it('should return unhealthy when app has both healthy and unhealthy tasks',
      function () {
        var health = MarathonStore.getFrameworkHealth(
          MockMarathonResponse.hasOnlyUnhealth.apps[0]
        );
        expect(health.key).toEqual('UNHEALTHY');
      }
    );

    it('should return healthy when app has healthy and no unhealthy tasks',
      function () {
        var health = MarathonStore.getFrameworkHealth(
          MockMarathonResponse.hasHealth.apps[0]
        );
        expect(health.key).toEqual('HEALTHY');
      }
    );

  });

  describe('#getServiceHealth', function () {

    it('returns NA when health is not available', function () {
      var health = MarathonStore.getServiceHealth('foo');
      expect(HealthLabels[health.key]).toEqual(HealthLabels.NA);
    });

    it('returns health for service', function () {
      MarathonStore.processMarathonGroups(MockMarathonResponse.hasHealth);
      var health = MarathonStore.getServiceHealth('Framework 1');
      expect(HealthLabels[health.key]).toEqual(HealthLabels.HEALTHY);
    });

  });

  describe('#getServiceInstalledTime', function () {

    it('returns a dateString', function () {
      MarathonStore.processMarathonGroups(MockMarathonResponse.hasVersion);
      let version = MarathonStore.getServiceInstalledTime('Framework 1');

      expect(!isNaN(Date.parse(version))).toEqual(true);
    });

    it('returns null when no service version', function () {
      MarathonStore.processMarathonGroups(MockMarathonResponse.hasVersion);
      let version = MarathonStore.getServiceInstalledTime('bloop');

      expect(version).toEqual(null);
    });

  });

  describe('#getServiceVersion', function () {

    it('returns a version', function () {
      MarathonStore.processMarathonGroups(MockMarathonResponse.hasVersion);
      let version = MarathonStore.getServiceVersion('Framework 1');

      expect(version).toEqual('0.1.0');
    });

    it('returns null when no service version', function () {
      MarathonStore.processMarathonGroups(MockMarathonResponse.hasNoVersion);
      let version = MarathonStore.getServiceVersion('Framework 1');

      expect(version).toEqual(null);
    });

  });

  describe('#getServiceImages', function () {

    it('returns null when app is not found', function () {
      var images = MarathonStore.getServiceImages('foo');
      expect(images).toEqual(null);
    });

    it('returns an object when services are found', function () {
      MarathonStore.processMarathonGroups(MockMarathonResponse.hasMetadata);
      var images = MarathonStore.getServiceImages('Framework 1');
      expect(images).toEqual(jasmine.any(Object));
    });

    it('returns three sizes of images when services are found', function () {
      MarathonStore.processMarathonGroups(MockMarathonResponse.hasMetadata);
      var images = MarathonStore.getServiceImages('Framework 1');
      var keys = Object.keys(images);
      expect(keys).toContain('icon-large');
      expect(keys).toContain('icon-medium');
      expect(keys).toContain('icon-small');
    });

  });

  describe('#processMarathonGroups', function () {

    it('should set Marathon health to idle with no apps', function () {
      MarathonStore.processMarathonGroups({apps: []});
      var marathonApps = MarathonStore.get('apps');
      expect(marathonApps.marathon.health.key).toEqual('IDLE');
    });

    it('should set Marathon health to healthy with some apps', function () {
      MarathonStore.processMarathonGroups(
        MockMarathonResponse.hasOnlyUnhealth
      );
      var marathonApps = MarathonStore.get('apps');
      expect(marathonApps.marathon.health.key).toEqual('HEALTHY');
    });

    it('should have apps with NA health if apps have no health checks', function () {
      MarathonStore.processMarathonGroups(
        MockMarathonResponse.hasNoHealthy
      );
      var marathonApps = MarathonStore.get('apps');

      for (var key in marathonApps) {
        var appHealth = marathonApps[key].health;

        if (key === 'marathon') {
          // The marathon app should still be healthy
          expect(appHealth.key).toEqual('HEALTHY');
        } else {
          expect(appHealth.key).toEqual('NA');
          expect(appHealth.value).toEqual(HealthTypes.NA);
        }
      }
    });

  });

  describe('#processMarathonDeployments', function () {

    beforeEach(function () {
      this.handler = jest.genMockFunction();
      MarathonStore.once(EventTypes.MARATHON_DEPLOYMENTS_CHANGE, this.handler);
      MarathonStore.processMarathonDeployments([{id: 'deployment-id'}]);
    });

    it('should hold the supplied deployments data on the store', function () {
      var deployments = MarathonStore.get('deployments');
      expect(deployments).toEqual(jasmine.any(DeploymentsList));
      expect(deployments.last().getId()).toEqual('deployment-id');
    });

    it('should emit a marathon deployment event', function () {
      expect(this.handler).toBeCalled();
    });

    it('should emit a populated DeploymentsList', function () {
      let deployments = this.handler.mock.calls[0][0];
      expect(deployments).toEqual(jasmine.any(DeploymentsList));
      expect(deployments.last().getId()).toEqual('deployment-id');
    });

  });

});

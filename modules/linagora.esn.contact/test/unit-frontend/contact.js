'use strict';

/* global chai: false */

var expect = chai.expect;

describe('The Contacts Angular module', function() {

  describe('The contact controller', function() {

    beforeEach(function() {
      angular.mock.module('ngRoute');
      angular.mock.module('esn.core');
      angular.mock.module('linagora.esn.contact');
      angular.mock.module('esn.alphalist');
    });

    beforeEach(angular.mock.inject(function($controller, $rootScope, $q) {
      this.controller = $controller;
      this.$rootScope = $rootScope;
      this.scope = $rootScope.$new();
      this.$q = $q;
    }));

    describe('The contactsListController controller', function() {

      describe('The loadContacts function', function() {

        it('should call the contactsService.list fn', function(done) {
          var user = {_id: 123};
          var contactsService = {
            list: function(path) {
              expect(path).to.equal('/addressbooks/' + user._id + '/contacts.json');
              done();
            }
          };

          this.controller('contactsListController', {
            $scope: this.scope,
            contactsService: contactsService,
            user: user
          });
          this.scope.loadContacts();
        });
      });

      describe('The openContactCreation function', function() {
        it('should open the contact creation window', function(done) {

          var user = {
            _id: 123
          };

          var location = {
            path: function(url) {
              expect(url).to.equal('/contact/new/' + user._id);
              done();
            }
          };

          var self = this;
          this.controller('contactsListController', {
            $scope: this.scope,
            $location: location,
            contactsService: {
              list: function() {
                var defer = self.$q.defer();
                defer.resolve({});
                return defer.promise;
              }
            },
            user: user
          });

          this.scope.openContactCreation();
        });
      });
    });
  });

  describe('The contactsService service', function() {
    var ICAL;

    beforeEach(function() {
      var self = this;
      this.tokenAPI = {
        _token: '123',
        getNewToken: function() {
          var token = this._token;
          return {
            then: function(callback) {
              callback({ data: { token: token } });
            }
          };
        }
      };
      this.uuid4 = {
        // This is a valid uuid4. Change this if you need other uuids generated.
        _uuid: '00000000-0000-4000-a000-000000000000',
        generate: function() {
          return this._uuid;
        }
      };

      angular.mock.module('ngRoute');
      angular.mock.module('esn.core');
      angular.mock.module('linagora.esn.contact');
      angular.mock.module(function($provide) {
        $provide.value('tokenAPI', self.tokenAPI);
        $provide.value('uuid4', self.uuid4);
      });
    });

    beforeEach(angular.mock.inject(function(contactsService, $httpBackend, $rootScope, _ICAL_) {
      this.$httpBackend = $httpBackend;
      this.$rootScope = $rootScope;
      this.contactsService = contactsService;

      ICAL = _ICAL_;
    }));

    describe('The list fn', function() {
      it('should list cards', function(done) {

        var contactsURL = '/addressbooks/5375de4bd684db7f6fbd4f97/contacts.json';
        var result = {
          _links: {
            self: {
              href: '/addressbooks/5375de4bd684db7f6fbd4f97/contacts.json'
            }
          },
          'dav:syncToken': 6,
          '_embedded': {
            'dav:item': [
              {
                '_links': {
                  'self': '/addressbooks/5375de4bd684db7f6fbd4f97/contacts/myuid.vcf'
                },
                'etag': '\'6464fc058586fff85e3522de255c3e9f\'',
                'data': [
                  'vcard',
                  [
                    ['version', {}, 'text', '4.0'],
                    ['uid', {}, 'text', 'myuid'],
                    ['n', {}, 'text', ['Burce', 'Willis', '', '', '']]
                  ]
                ]
              }
            ]
          }
        };

        // The server url needs to be retrieved
        this.$httpBackend.expectGET('/davserver/api/info').respond({ url: ''});

        // The carddav server will be hit
        this.$httpBackend.expectGET(contactsURL).respond(result);

        this.contactsService.list(contactsURL).then(function(cards) {
            expect(cards).to.be.an.array;
            expect(cards.length).to.equal(1);
            expect(cards[0].id).to.equal('myuid');
            expect(cards[0].vcard).to.be.an('object');
            expect(cards[0].etag).to.be.empty;
            expect(cards[0].path).to.be.empty;
        }.bind(this)).finally (done);

        this.$rootScope.$apply();
        this.$httpBackend.flush();
      });
    });

    describe('The getCard fn', function() {

      it('should return a contact', function(done) {
        // The server url needs to be retrieved
        this.$httpBackend.expectGET('/davserver/api/info').respond({ url: ''});

        // The caldav server will be hit
        this.$httpBackend.expectGET('/path/to/card.vcf').respond(
          ['vcard', [
            ['version', {}, 'text', '4.0'],
            ['uid', {}, 'text', 'myuid'],
            ['fn', {}, 'text', 'first last'],
            ['n', {}, 'text', ['last', 'first']],
            ['email', { type: 'Work' }, 'text', 'mailto:foo@example.com'],
            ['tel', { type: 'Work' }, 'uri', 'tel:123123'],
            ['adr', { type: 'Home' }, 'text', ['', '', 's', 'c', '', 'z', 'co']],
            ['org', {}, 'text', 'org'],
            ['url', { type: 'Work' }, 'uri', 'http://linagora.com'],
            ['role', {}, 'text', 'role'],
            ['socialprofile', { type: 'Twitter' }, 'text', '@AwesomePaaS'],
            ['categories', {}, 'text', 'starred', 'asdf'],
            ['bday', {}, 'date', '2015-01-01'],
            ['nickname', {}, 'text', 'nick'],
            ['note', {}, 'text', 'notes'],
            ['photo', {}, 'text', 'data:image/png;base64,iVBOR=']
          ], []],
          // headers:
          { 'ETag': 'testing-tag' }
        );

        this.contactsService.getCard('/path/to/card.vcf').then(function(contact) {
          expect(contact).to.be.an('object');
          expect(contact.id).to.equal('myuid');

          expect(contact.vcard).to.be.an('object');
          expect(contact.path).to.equal('/path/to/card.vcf');
          expect(contact.etag).to.equal('testing-tag');

          expect(contact.firstName).to.equal('first');
          expect(contact.lastName).to.equal('last');
          expect(contact.displayName).to.equal('first last');
          expect(contact.emails).to.deep.equal([{type: 'Work', value: 'foo@example.com'}]);
          expect(contact.addresses).to.deep.equal([{
            type: 'Home', street: 's', city: 'c', zip: 'z', country: 'co'
          }]);
          expect(contact.org).to.equal('org');
          expect(contact.orgUri).to.equal('http://linagora.com');
          expect(contact.orgRole).to.equal('role');
          expect(contact.social).to.deep.equal([{ type: 'Twitter', value: '@AwesomePaaS' }]);
          expect(contact.tags).to.deep.equal([{ text: 'asdf' }]);
          expect(contact.starred).to.be.true;
          expect(contact.birthday.getTime()).to.equal(new Date(2015, 0, 1).getTime());
          expect(contact.nickname).to.equal('nick');
          expect(contact.notes).to.equal('notes');
          expect(contact.photo).to.equal('data:image/png;base64,iVBOR=');
        }.bind(this)).finally (done);

        this.$rootScope.$apply();
        this.$httpBackend.flush();
      });

      it('should return a contact with no photo if not defined in vCard', function(done) {
        this.$httpBackend.expectGET('/davserver/api/info').respond({ url: ''});
        this.$httpBackend.expectGET('/path/to/card.vcf').respond(
          ['vcard', [
            ['version', {}, 'text', '4.0'],
            ['uid', {}, 'text', 'myuid']
          ], []]
        );

        this.contactsService.getCard('/path/to/card.vcf').then(function(contact) {
          expect(contact.photo).to.not.exist;
        }.bind(this)).finally (done);

        this.$httpBackend.flush();
      });

    });

    describe('The create fn', function() {
      function unexpected(done) {
        done(new Error('Unexpected'));
      }

      it('should fail on missing uid', function(done) {
        var vcard = new ICAL.Component('vcard');

        this.contactsService.create('/path/to/book', vcard).then(
          unexpected.bind(null, done), function(e) {
            expect(e.message).to.equal('Missing UID in VCARD');
            done();
          }
        );
        this.$rootScope.$apply();
      });

      it('should fail on 500 response status', function(done) {
        // The server url needs to be retrieved
        this.$httpBackend.expectGET('/davserver/api/info').respond({ url: ''});

        // The caldav server will be hit
        this.$httpBackend.expectPUT('/path/to/book/00000000-0000-4000-a000-000000000000.vcf').respond(500, '');

        var vcard = new ICAL.Component('vcard');
        vcard.addPropertyWithValue('uid', '00000000-0000-4000-a000-000000000000');

        this.contactsService.create('/path/to/book', vcard).then(
          unexpected.bind(null, done), function(response) {
            expect(response.status).to.equal(500);
            done();
          }
        );

        this.$rootScope.$apply();
        this.$httpBackend.flush();
      });

      it('should fail on a 2xx status that is not 201', function(done) {
        var vcard = new ICAL.Component('vcard');
        vcard.addPropertyWithValue('uid', '00000000-0000-4000-a000-000000000000');

        // The server url needs to be retrieved
        this.$httpBackend.expectGET('/davserver/api/info').respond({ url: ''});

        // The caldav server will be hit
        this.$httpBackend.expectPUT('/path/to/book/00000000-0000-4000-a000-000000000000.vcf').respond(200, '');

        this.contactsService.create('/path/to/book', vcard).then(
          unexpected.bind(null, done), function(response) {
            expect(response.status).to.equal(200);
            done();
          }
        );

        this.$rootScope.$apply();
        this.$httpBackend.flush();
      });

      it('should succeed when everything is correct', function(done) {
        var vcard = new ICAL.Component('vcard');
        vcard.addPropertyWithValue('uid', '00000000-0000-4000-a000-000000000000');

        // The server url needs to be retrieved
        this.$httpBackend.expectGET('/davserver/api/info').respond({ url: ''});

        // The carddav server will be hit
        this.$httpBackend.expectPUT('/path/to/book/00000000-0000-4000-a000-000000000000.vcf').respond(201, vcard.toJSON());

        this.contactsService.create('/path/to/book', vcard).then(
          function(response) {
            expect(response.status).to.equal(201);
            expect(response.data).to.deep.equal(vcard.toJSON());
            done();
          }
        );

        this.$rootScope.$apply();
        this.$httpBackend.flush();
      });
    });

    describe('The modify fn', function() {
      function unexpected(done) {
        done(new Error('Unexpected'));
      }

      beforeEach(function() {
        var vcard = new ICAL.Component('vcard');
        vcard.addPropertyWithValue('version', '4.0');
        vcard.addPropertyWithValue('uid', '00000000-0000-4000-a000-000000000000');
        vcard.addPropertyWithValue('fn', 'test card');
        this.vcard = vcard;

        this.$httpBackend.expectGET('/davserver/api/info').respond({ url: ''});
      });

      it('should fail if status is 201', function(done) {
        this.$httpBackend.expectPUT('/path/to/uid.vcf').respond(201, this.vcard.toJSON());

        this.contactsService.modify('/path/to/uid.vcf', this.vcard).then(
          unexpected.bind(null, done), function(response) {
            expect(response.status).to.equal(201);
            done();
          }
        );

        this.$rootScope.$apply();
        this.$httpBackend.flush();
      });

      it('should succeed on 200', function(done) {
        this.$httpBackend.expectPUT('/path/to/uid.vcf').respond(200, this.vcard.toJSON(), { 'ETag': 'changed-etag' });

        this.contactsService.modify('/path/to/uid.vcf', this.vcard).then(
          function(shell) {
            expect(shell.displayName).to.equal('test card');
            expect(shell.etag).to.equal('changed-etag');
            expect(shell.vcard.toJSON()).to.deep.equal(this.vcard.toJSON());
            done();
          }.bind(this), unexpected.bind(null, done)
        );

        this.$rootScope.$apply();
        this.$httpBackend.flush();
      });

      it('should succeed on 204', function(done) {
        var headers = { 'ETag': 'changed-etag' };
        this.$httpBackend.expectPUT('/path/to/uid.vcf').respond(204, '');
        this.$httpBackend.expectGET('/path/to/uid.vcf').respond(200, this.vcard.toJSON(), headers);

        this.contactsService.modify('/path/to/uid.vcf', this.vcard).then(
          function(shell) {
            expect(shell.displayName).to.equal('test card');
            expect(shell.etag).to.equal('changed-etag');
            done();
          }, unexpected.bind(null, done)
        );

        this.$rootScope.$apply();
        this.$httpBackend.flush();
      });

      it('should send etag as If-Match header', function(done) {
        var requestHeaders = {
          'Content-Type': 'application/vcard+json',
          'Prefer': 'return-representation',
          'If-Match': 'etag',
          'ESNToken': '123',
          'Accept': 'application/json, text/plain, */*'
        };
        this.$httpBackend.expectPUT('/path/to/uid.vcf', this.vcard.toJSON(), requestHeaders).respond(200, this.vcard.toJSON(), { 'ETag': 'changed-etag' });

        this.contactsService.modify('/path/to/uid.vcf', this.vcard, 'etag').then(
          function(shell) { done(); }, unexpected.bind(null, done)
        );

        this.$rootScope.$apply();
        this.$httpBackend.flush();
      });
    });

    describe('The shellToVCARD fn', function() {
      function compareShell(contactsService, shell, ical) {
        var vcard = contactsService.shellToVCARD(shell);
        var properties = vcard.getAllProperties();
        var propkeys = properties.map(function(p) {
          return p.name;
        }).sort();
        var icalkeys = Object.keys(ical).sort();

        var message = 'Key count mismatch in ical object.\n' +
                      'expected: ' + icalkeys + '\n' +
                      '   found: ' + propkeys;
        expect(properties.length).to.equal(icalkeys.length, message);

        for (var propName in ical) {
          var prop = vcard.getFirstProperty(propName);
          expect(prop, 'Missing: ' + propName).to.be.ok;
          var value = prop.toICAL();
          expect(value).to.equal(ical[propName].toString());
        }
      }

      it('should correctly create a card with display name', function() {
        var shell = {
          displayName: 'display name'
        };
        var ical = {
          version: 'VERSION:4.0',
          uid: 'UID:00000000-0000-4000-a000-000000000000',
          fn: 'FN:display name'
        };

        compareShell(this.contactsService, shell, ical);
      });

      it('should correctly create a card with first/last name', function() {
        var shell = {
          lastName: 'last',
          firstName: 'first'
        };
        var ical = {
          version: 'VERSION:4.0',
          uid: 'UID:00000000-0000-4000-a000-000000000000',
          fn: 'FN:first last',
          n: 'N:last;first'
        };

        compareShell(this.contactsService, shell, ical);
      });
      it('should correctly create a card with all props', function() {
        var shell = {
          lastName: 'last',
          firstName: 'first',
          starred: true,
          tags: [{ text: 'a' }, { text: 'b'}],
          emails: [{ type: 'Home', value: 'email@example.com' }],
          tel: [{ type: 'Home', value: '123123' }],
          addresses: [{ type: 'Home', street: 's', city: 'c', zip: 'z', country: 'co' }],
          social: [{ type: 'Twitter', value: '@AwesomePaaS' }],
          org: 'org',
          orgRole: 'role',
          orgUri: 'orgUri',
          birthday: new Date(2015, 0, 1),
          nickname: 'nick',
          notes: 'notes',
          photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAA'
        };
        var ical = {
          version: 'VERSION:4.0',
          uid: 'UID:00000000-0000-4000-a000-000000000000',
          fn: 'FN:first last',
          n: 'N:last;first',
          email: 'EMAIL;TYPE=Home:mailto:email@example.com',
          adr: 'ADR;TYPE=Home:;;s;c;;z;co',
          tel: 'TEL;TYPE=Home:tel:123123',
          org: 'ORG:org',
          url: 'URL;TYPE=Work:http://orgUri',
          role: 'ROLE:role',
          socialprofile: 'SOCIALPROFILE;TYPE=Twitter:@AwesomePaaS',
          categories: 'CATEGORIES:a,b,starred',
          bday: 'BDAY;VALUE=DATE:20150101',
          nickname: 'NICKNAME:nick',
          note: 'NOTE:notes',
          photo: 'PHOTO:data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAA'
        };

        compareShell(this.contactsService, shell, ical);
      });
    });

    describe('The remove fn', function() {

      beforeEach(function() {
        this.contact = {id: '00000000-0000-4000-a000-000000000000'};
        this.$httpBackend.expectGET('/davserver/api/info').respond({url: ''});
      });

      function unexpected(done) {
        done(new Error('Unexpected'));
      }

      it('should fail on a status that is not 204', function(done) {

        this.$httpBackend.expectDELETE('/path/to/book/00000000-0000-4000-a000-000000000000.vcf').respond(201);

        this.contactsService.remove('/path/to/book', this.contact).then(
          unexpected.bind(null, done), function(response) {
            expect(response.status).to.equal(201);
            done();
          }
        );
        this.$rootScope.$apply();
        this.$httpBackend.flush();
      });

      it('should succeed when everything is correct', function(done) {

        this.$httpBackend.expectDELETE('/path/to/book/00000000-0000-4000-a000-000000000000.vcf').respond(204);

        this.contactsService.remove('/path/to/book', this.contact).then(
          function(response) {
            expect(response.status).to.equal(204);
            done();
          }
        );
        this.$rootScope.$apply();
        this.$httpBackend.flush();
      });

      it('should send etag as If-Match header', function(done) {
        var requestHeaders = {
          'If-Match': 'etag',
          'ESNToken': '123',
          'Accept': 'application/json, text/plain, */*'
        };

        this.$httpBackend.expectDELETE('/path/to/book/00000000-0000-4000-a000-000000000000.vcf', requestHeaders).respond(204);

        this.contactsService.remove('/path/to/book', this.contact, 'etag').then(
          function() { done(); }, unexpected.bind(null, done)
        );
        this.$rootScope.$apply();
        this.$httpBackend.flush();
      });
    });

  });

  describe('The contactListItem directive', function() {

    beforeEach(function() {

      this.notificationFactory = {};
      this.contactsService = {};
      var self = this;

      angular.mock.module('ngRoute');
      angular.mock.module('esn.core');
      angular.mock.module('linagora.esn.contact');
      angular.mock.module('esn.alphalist');
      module('jadeTemplates');

      angular.mock.module(function($provide) {
        $provide.value('notificationFactory', self.notificationFactory);
        $provide.value('contactsService', self.contactsService);
      });
    });

    beforeEach(angular.mock.inject(function($rootScope, $compile, $q) {
      this.$rootScope = $rootScope;
      this.$compile = $compile;
      this.$q = $q;
      this.scope = $rootScope.$new();
      this.scope.contact = {
        uid: 'myuid'
      };
      this.scope.bookId = '123';
      this.html = '<contact-list-item contact="contact" book-id="bookId"></contact-list-item>';
    }));

    describe('Setting scope values', function() {

      it('should set the first contact email and tel in scope', function(done) {
        var tel1 = '+33499998899';
        var tel2 = '+33499998800';
        var email1 = 'yo@open-paas.org';
        var email2 = 'lo@open-paas.org';

        this.scope.contact.tel = [{type: 'Home', value: tel1}, {type: 'Work', value: tel2}];
        this.scope.contact.emails = [{type: 'Home', value: email1}, {type: 'Work', value: email2}];

        var element = this.$compile(this.html)(this.scope);
        this.scope.$digest();
        var iscope = element.isolateScope();
        expect(iscope.tel).to.equal(tel1);
        expect(iscope.email).to.equal(email1);
        done();
      });
    });

    describe('the deleteContact function', function() {

      it('should call contactsService.remove()', function(done) {

        this.contactsService.remove = done();

        var element = this.$compile(this.html)(this.scope);
        this.scope.$digest();
        var iscope = element.isolateScope();
        iscope.deleteContact();
        done(new Error());
      });

      it('should call $scope.$emit when remove is ok', function(done) {
        var self = this;
        this.notificationFactory.weakInfo = function() {};

        var defer = this.$q.defer();
        defer.resolve();
        this.contactsService.remove = function() {
          return defer.promise;
        };

        this.scope.$on('contact:deleted', function(event, data) {
          expect(data).to.deep.equal(self.scope.contact);
          done();
        });

        var element = this.$compile(this.html)(this.scope);
        this.scope.$digest();
        var iscope = element.isolateScope();
        iscope.deleteContact();
        this.scope.$digest();

        done(new Error());
      });

      it('should display notification when on remove success', function(done) {
        this.notificationFactory.weakInfo = function() {
          done();
        };

        var defer = this.$q.defer();
        defer.resolve();
        this.contactsService.remove = function() {
          return defer.promise;
        };

        var element = this.$compile(this.html)(this.scope);
        this.scope.$digest();
        var iscope = element.isolateScope();
        iscope.deleteContact();
        this.scope.$digest();
        done(new Error());
      });

      it('should display error when on remove failure', function(done) {
        this.notificationFactory.weakError = function() {
          done();
        };

        var defer = this.$q.defer();
        defer.reject();
        this.contactsService.remove = function() {
          return defer.promise;
        };

        var element = this.$compile(this.html)(this.scope);
        this.scope.$digest();
        var iscope = element.isolateScope();
        iscope.deleteContact();
        this.scope.$digest();
        done(new Error());
      });
    });
  });
});
"use strict";

/* eslint-env node */
/* eslint no-underscore-dangle:0 */
/* globals describe:0, it:0, before:0, after:0, beforeEach:0, afterEach:0 */

var expect = require("chai").expect;
var rewire = require("rewire");

var bruteforce = rewire("../lib/bruteforce");

describe("signature.bruteforce", function () {

  var testExtract = function (msg, text, signature) {
    expect(bruteforce.extractSignature(msg)).to.eql({
      "text": text,
      "signature": signature
    });
  };

  it("should parse empty body", function () {
    testExtract("", "", null);
  });

  it("should parse unsigned body", function () {
    var msg = "Hey man!";
    testExtract(msg, msg, null);
  });

  it("should parse signature only messages", function () {
    var msg = "--\nRoman";
    testExtract(msg, msg, null);
  });

  it("should detect dash signatures", function () {
    testExtract("Hey man! How r u?\n---\nRoman", "Hey man! How r u?", "---\nRoman");
    testExtract("Hey!\n-roman", "Hey!", "-roman");
    testExtract("Hey!\n\n- roman", "Hey!", "- roman");
    testExtract("Wow. Awesome!\n--\nBob Smith", "Wow. Awesome!", "--\nBob Smith");
    testExtract("hiring \r\n\r\n\r\n--\r\nMarissa\r\nTest Signature 3", "hiring",
      "--\r\nMarissa\r\nTest Signature 3");
  });

  it("should detect dash and asterisk signatures", function () {
    testExtract("Hey man! How r u?\n*---*\nRoman", "Hey man! How r u?", "*---*\nRoman");
    testExtract("Hey man! How r u?\n**\nRoman", "Hey man! How r u?", "**\nRoman");
    testExtract("Hey man! How r u?\n*----*\nRoman", "Hey man! How r u?", "*----*\nRoman");
  });

  it("should detect underscore and asterisk signatures", function () {
    testExtract("Hey man! How r u?\n*__________*\nRoman", "Hey man! How r u?", "*__________*\nRoman");
    testExtract("Hey man! How r u?\n___\nthanks\nRoman", "Hey man! How r u?", "___\nthanks\nRoman");
    testExtract("Hey man! How r u?\n__________\nRoman", "Hey man! How r u?", "__________\nRoman");
    testExtract("Hey man! How r u?\n___\nRoman", "Hey man! How r u?", "___\nRoman");
    testExtract("Wow. Awesome!\n__\nBob Smith", "Wow. Awesome!", "__\nBob Smith");
    testExtract("hiring \r\n\r\n\r\n__\r\nMarissa\r\nTest Signature 3", "hiring",
      "__\r\nMarissa\r\nTest Signature 3");
  });

  it("should detect signature words", function () {
    testExtract("Hey!\n\nThanks!\nRoman", "Hey!", "Thanks!\nRoman");
    testExtract("Hey!\n\nThank you!\nRoman", "Hey!", "Thank you!\nRoman");
    testExtract("Hey!\n--\nBest regards,\n\nRoman", "Hey!", "--\nBest regards,\n\nRoman");
    testExtract("Hey!\n--\n--\nRegards,\nRoman", "Hey!", "--\n--\nRegards,\nRoman");
  });

  it("should detect iphone signature", function () {
    testExtract("Hey!\n\nSent from my iPhone!", "Hey!", "Sent from my iPhone!");
  });

  it("should detect Mailbox for iPhone signature", function () {
    testExtract("Blah\nSent from Mailbox for iPhone", "Blah", "Sent from Mailbox for iPhone");
  });

  it("should detect non-signature lines starting with signature-words", function () {
    testExtract("Hey man!\nThanks for your attention.\n--\nThanks!\nRoman", "Hey man!\nThanks for your attention.", "--\nThanks!\nRoman");
  });

  it("should detect non-signature lines starting with dashes", function () {
    testExtract("Hey man!\nLook at this:\n\n--> one\n--> two\n--\nRoman", "Hey man!\nLook at this:\n\n--> one\n--> two", "--\nRoman");
  });

  it("should keep blank lines inside signature", function () {
    testExtract("Blah.\n\n-Lev.\n\nSent from my HTC smartphone!", "Blah.", "-Lev.\n\nSent from my HTC smartphone!");
    testExtract("Blah.\n--\n\nJohn Doe", "Blah.", "--\n\nJohn Doe");
  });

  it("should detect BlackBerry signature", function () {
    testExtract("Heeyyoooo.\nSent wirelessly from my BlackBerry device on the Bell network.\nEnvoyé sans fil par mon terminal mobile BlackBerry sur le réseau de Bell.", "Heeyyoooo.", "Sent wirelessly from my BlackBerry device on the Bell network.\nEnvoyé sans fil par mon terminal mobile BlackBerry sur le réseau de Bell.");
    testExtract("Blah\nEnviado desde mi oficina mÃ³vil BlackBerryÂ® de Telcel", "Blah", "Enviado desde mi oficina mÃ³vil BlackBerryÂ® de Telcel");
  });

  it("should survive crash in signature detection", function () {
    bruteforce.__with__({
      "getDelimiter": function getDelimiter () {
        throw new Error("Unexpected failure!");
      }
    })(function () {
      testExtract("Hey\n--\nBob", "Hey\n--\nBob", null);
    });
  });

  it("should not detect signature at first line", function () {
    testExtract("Thanks,\n\nBlah\n\nregards\n\nJohn Doe", "Thanks,\n\nBlah", "regards\n\nJohn Doe");
  });

  it("should ignore empty lines when checking for max lines signature", function () {
    bruteforce.__with__({
      "SIGNATURE_MAX_LINES": 2
    })(function () {
      testExtract("Thanks,\nBlah\n\nregards\n\n\nJohn Doe", "Thanks,\nBlah", "regards\n\n\nJohn Doe");
    });
  });

  describe("French support", function () {

    it("should detect signature words", function () {
      testExtract("Hey!\n\nMerci!\nRoman", "Hey!", "Merci!\nRoman");
      testExtract("Coucou !\n\n\nCordialement,\n*Nicolas Chambrier*\n\n*​[image: Photos du profil]Photos du profil 1 photo\n<https://plus.google.com/photos/105040947817397227789/albums/5668513848939008417>​*\n*Mercenaire IT*\n\nTél: *0633334403 <0633334403>*\nVCard: http://nicolas.chambrier.fr/vcard", "Coucou !", "Cordialement,\n*Nicolas Chambrier*\n\n*​[image: Photos du profil]Photos du profil 1 photo\n<https://plus.google.com/photos/105040947817397227789/albums/5668513848939008417>​*\n*Mercenaire IT*\n\nTél: *0633334403 <0633334403>*\nVCard: http://nicolas.chambrier.fr/vcard")
      testExtract("Hey!\n--\nCordialement,\n\nRoman", "Hey!", "--\nCordialement,\n\nRoman");
      testExtract("Hey!\n--\nBien cordialement,\n\nRoman", "Hey!", "--\nBien cordialement,\n\nRoman");
      testExtract("Hey!\n--\nVeuillez recevoir, monsieur, l'expression de mes salutations distinguées,\n\nRoman", "Hey!", "--\nVeuillez recevoir, monsieur, l'expression de mes salutations distinguées,\n\nRoman");
      testExtract("Hey!\n--\n--\nMes remerciements,\nRoman", "Hey!", "--\n--\nMes remerciements,\nRoman");
    });

    it("should detect iphone signature", function () {
      testExtract("Hey!\n\nEnvoyé depuis mon iPhone!", "Hey!", "Envoyé depuis mon iPhone!");
    });

    it("should detect non-signature lines starting with signature-words", function () {
      testExtract("Hey man!\nMerci de ton aide.\n--\nMerci!\nRoman", "Hey man!\nMerci de ton aide.", "--\nMerci!\nRoman");
    });

  });

  describe("signature candidate", function () {

    function testCandidate (lines, result) {
      expect(bruteforce.getSignatureCandidate(lines)).to.eql(result);
    }

    it("should have no signature if not at least two non-empty lines", function () {
      [[], [""], ["", ""], ["abc"]].forEach(function (lines) {
        testCandidate(lines, []);
      });
    });

    it("should never include first line", function () {
      testCandidate(["text", "signature"], ["signature"]);
    });

    it("should be limited by SIGNATURE_MAX_LINES", function () {
      bruteforce.__with__({
        "SIGNATURE_MAX_LINES": 3
      })(function () {
        testCandidate(["text", "", "", "signature"], ["signature"]);
      });
      bruteforce.__with__({
        "SIGNATURE_MAX_LINES": 2
      })(function () {
        testCandidate(["text1", "text2", "signature1", "", "signature2"], ["signature1", "", "signature2"]);
      });
    });

    it("should not include long lines", function () {
      bruteforce.__with__({
        "TOO_LONG_SIGNATURE_LINE": 3
      })(function () {
        testCandidate(["BR", "long", "Bob"], ["Bob"]);
      });
    });

    it("should handle dashed lists", function () {
      testCandidate(["List:", "- item1", "- item 2", "--", "Bob"], ["--", "Bob"]);
    });

  });

  describe("internals", function () {

    // Note: compared to original library's tests, values are all reverted
    // this is normal and expected, see sources for details

    var markCandidateIndices = bruteforce.__get__("markCandidateIndices");

    it("should mark candidate indices", function () {
      bruteforce.__with__({
        "TOO_LONG_SIGNATURE_LINE": 3
      })(function () {
        expect(markCandidateIndices(["BR,  ", "long", "Bob"], [0, 1, 2])).to.equal("clc");
        expect(markCandidateIndices(["-", "long", "-", "- i", "Bob"], [0, 2, 3, 4])).to.equal("cdcc");
      });
    });

    var processMarkedCandidateIndices = bruteforce.__get__("processMarkedCandidateIndices");

    it("should test process marked candidate indices", function () {
      expect(processMarkedCandidateIndices([2, 13, 15], "ccd")).to.eql([2, 13, 15]);
      expect(processMarkedCandidateIndices([2, 13, 15], "cdd")).to.eql([15]);
      expect(processMarkedCandidateIndices([13, 15], "cc")).to.eql([13, 15]);
      expect(processMarkedCandidateIndices([15], "cl")).to.eql([15]);
      expect(processMarkedCandidateIndices([13, 15], "dl")).to.eql([15]);
    });

  });

  describe("advanced features", function () {

    var tooLong20 = bruteforce.__with__({
      "TOO_LONG_SIGNATURE_LINE": 20
    });

    it("should ignore URLs", function () {
      tooLong20(function () {
        testExtract("Hey man! How r u?\n---\nRoman and http://some.very.long.com/url John", "Hey man! How r u?", "---\nRoman and http://some.very.long.com/url John");
      });
    });

  });

  describe("Forwarded email block stripping", function() {
    it("should ignore forwarded email blocks", function () {
      testExtract("---------- Forwarded message ----------\nFrom: Marissa Montgomery <m@m15y.com>\n" +
        "Date: Wed, Nov 15, 2017 at 3:13 PM\nSubject: hey\nTo: marissa@askspoke.com\n\nintern hiring?",
        "intern hiring?", null);
      testExtract("---------- Forwarded message ----------\nFrom: Marissa Montgomery <m@m15y.com>\n" +
        "Date: Wed, Nov 15, 2017 at 3:13 PM\nSubject: hey\nTo: marissa@askspoke.com\n\nintern hiring?\n\n---\nRoman",
        "intern hiring?", "---\nRoman");
      testExtract("---------- Forwarded message ----------\nFrom:\nDate:\nSubject:\nTo:", "", null);
      testExtract("hi\n---------- Forwarded message ----------\nFrom: Marissa Montgomery <marissa@askspoke.com>\n" +
        "Date: Thu, Nov 16, 2017 at 11:46 AM\nSubject: Fwd: hey\nTo: m@m15y.com\n\n\nand second bit of text\n" +
        "---------- Forwarded message ----------\nFrom: Marissa Montgomery <m@m15y.com>\nDate: Thu, Nov 16, 2017 at 11:46 AM" +
        "\nSubject: hey\nTo: marissa@askspoke.com\n\n\nfirst bit of text",
        "hi\n\n\n\nand second bit of text\n\n\n\nfirst bit of text", null)
      testExtract("and second bit of text\n---------- Forwarded message ----------\nFrom: Marissa Montgomery <m@m15y.com>\n" +
        "Date: Thu, Nov 16, 2017 at 11:46 AM\nSubject: hey\nTo: marissa@askspoke.com\nfirst bit of text\n-- \nMarissa Montgomery\nTest signature 3",
        "and second bit of text\n\nfirst bit of text", "-- \nMarissa Montgomery\nTest signature 3");
      testExtract("hi\r\n---------- Forwarded message ----------\r\nFrom: Marissa Montgomery <marissa@askspoke.com>\r\n" +
        "Date: Thu, Nov 16, 2017 at 11:46 AM\r\nSubject: Fwd: hey\r\nTo: m@m15y.com\r\n\r\n\r\nand second bit of text\r\n" +
        "---------- Forwarded message ----------\r\nFrom: Marissa Montgomery <m@m15y.com>\r\nDate: Thu, Nov 16, 2017 at 11:46 AM" +
        "\r\nSubject: hey\r\nTo: marissa@askspoke.com\r\n\r\n\r\nfirst bit of text",
        "hi\r\n\r\n\r\n\r\nand second bit of text\r\n\r\n\r\n\r\nfirst bit of text", null)
    });
  });

  describe("Ignores Google group footer", function () {
    var googleFooter =
    ['You received this message because you are subscribed to the Google Groups "pplocal" group.',
     'To unsubscribe from this group and stop receiving emails from it, send an email to pplocal+unsubscribe@googlegroups.com.',
     'To post to this group, send email to pplocal@googlegroups.com.',
     'To view this discussion on the web visit https://groups.google.com/d/msgid/pplocal/CAHc7-p-EDR-n%2B2evsCo56wA7EGn4i52Sbf4Ugq9UodEQQOkjAw%40mail.gmail.com.',
     'For more options, visit https://groups.google.com/d/optout.'].join('\n');

    it("should ignore google footer with body", function () {
      testExtract([
          'Hey!',
          '',
          'Wifi not working.',
          '',
          '--',
          'Best regards,',
          'P',
          '',
          googleFooter
        ].join('\n'), [
          'Hey!',
          '',
          'Wifi not working.'
        ].join('\n'), [
          '--',
          'Best regards,',
          'P'
        ].join('\n')
      );

      testExtract([
          'Hey!',
          '',
          'Wifi not working.',
          '',
          '--',
          'Best regards,',
          'P',
          '',
          '--',
          googleFooter
        ].join('\n'), [
          'Hey!',
          '',
          'Wifi not working.'
        ].join('\n'), [
          '--',
          'Best regards,',
          'P'
        ].join('\n')
      );

      testExtract([
          'Hey!',
          '',
          'Wifi not working.',
          '',
          '--',
          'Best regards,',
          'P',
          '',
          '-- ',
          googleFooter
        ].join('\n'), [
          'Hey!',
          '',
          'Wifi not working.'
        ].join('\n'), [
          '--',
          'Best regards,',
          'P'
        ].join('\n')
      );
    });

    it("should ignore google footer without body", function () {
      testExtract([
          '--',
          'Best regards,',
          'P',
          '',
          '--',
          googleFooter
        ].join('\n'),
        '--', [
          'Best regards,',
          'P'
        ].join('\n')
      );

      testExtract([
          '--',
          googleFooter
        ].join('\n'),
        '',
        null
      );

    });
  });

});

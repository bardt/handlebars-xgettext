var newline = /\r?\n|\r/g;

/**
 * Constructor
 */
function Parser(keywords) {
  if (!keywords) {
    keywords = ['gettext', '_'];
  }

  if (typeof keywords === 'string') {
    keywords = [keywords];
  }

  this.keywords = splitKeywords(keywords);

  keywordsNames = this.keywords.map(function(kw) {
    return kw.name;
  });

  this.pattern = new RegExp('\\{\\{(' + keywordsNames.join('|') + ') ((?: ?"(?:(?:\\\\.|[^"\\\\])*)")+) ?\\w* ?\\}\\}', 'gm');
  this.argsPattern = new RegExp('"((?:\\.|[^"\\\\])+)"', 'gm');
}

function splitKeyword(keyword) {
  var argsString = keyword.split(':')[1];
  var args = [];

  if (argsString) {
    args = argsString.split(',').map(function(arg) {
      var isContext = arg.indexOf('c') != -1;

      return {
        number: parseInt(arg),
        isContext: isContext
      };
    });
  }

  return {
    name: keyword.split(':')[0],
    args: args
  };
}

function splitKeywords(keywords) {
  return keywords.map(splitKeyword);
}

/**
 * Given a Handlebars template string returns the list of i18n strings.
 *
 * @param String template The content of a HBS template.
 * @return Object The list of translatable strings, the line(s) on which each appears and an optional plural form.
 */
Parser.prototype.parse = function (template, ctxSeparator) {
  var result = {},
    match,
    args,
    msg;

  ctxSeparator = ctxSeparator || '+%';

  while ((match = this.pattern.exec(template)) !== null) {
    // find finction settings by name
    var keyword;
    this.keywords.forEach(function(kw) {
      if (match[1] == kw.name) {
        keyword = kw;
      }
    });

    args = [];
    var argMatch;
    while ((argMatch = this.argsPattern.exec(match[2])) !== null) {
      args.push(argMatch[1]);
    }

    if (keyword && keyword.args && keyword.args.length) {
      var ctx = '';
      // find ctx
      keyword.args.forEach(function(arg) {
        if (!ctx && args[arg.number-1] && arg.isContext) {
          ctx = args[arg.number-1];
        }
      });

      msg = null;
      keyword.args.forEach(function(arg) {
        var argValue = args[arg.number-1];
        if (argValue) {
          // do not process ctx
          if (arg.isContext) return;

          // if msg not set, set it
          if (!msg) {
            var resultKey = argValue;
            if (ctx) {
              resultKey += ctxSeparator + ctx;
            }
            msg = result[resultKey] = result[resultKey] || {};
            msg.msgid = argValue;
          } else {
            msg.plural = msg.plural || argValue;
          }
        }
      });

      if (ctx) {
        msg.ctx = ctx;
      }

    } else {
      // Default
      msg = result[args[0]] = result[args[0]] || {};

      if (args[1]) {
        msg.plural = msg.plural || args[1];
      }
    }

    // Adds line comment
    msg.line = msg.line || [];
    msg.line.push(template.substr(0, match.index).split(newline).length);
  }

  return result;
};

module.exports = Parser;

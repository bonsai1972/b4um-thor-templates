# frozen_string_literal: true

require "json"
require "syntax_tree"

request = JSON.parse($stdin.read.force_encoding("UTF-8"))

plugins = request.fetch("rubyPlugins", "").split(",").map(&:strip).reject(&:empty?)
plugins << "plugin/single_quotes" if request["rubySingleQuote"]
plugins << "plugin/trailing_comma" unless request["trailingComma"] == "none"
plugins.uniq.each { |plugin| require "syntax_tree/#{plugin}" }

# Vorhandene Argumentumbrüche anhand des Syntaxbaums erhalten.
module B4umRubyFormatting
  def self.multiline_list?(items)
    items.each_cons(2).any? { |left, right| left.location.end_line < right.location.start_line }
  end

  def self.multiline_call_options?(call, parts)
    (call.is_a?(SyntaxTree::Command) || call.is_a?(SyntaxTree::CommandCall) ||
      call.is_a?(SyntaxTree::CallNode)) &&
      call.message.respond_to?(:value) && %w[add_column redirect_to].include?(call.message.value) &&
      parts.last.is_a?(SyntaxTree::BareAssocHash)
  end

  module Arguments
    def format(q)
      parent = q.parent
      parenthesized = parent.is_a?(SyntaxTree::ArgParen) && parent.location.start_line < parent.location.end_line
      call = parent.is_a?(SyntaxTree::ArgParen) ? q.grandparent : parent

      # Spalten und Weiterleitungen mit Optionen erhalten unabhängig von
      # der Zeilenlänge dieselbe mehrzeilige Darstellung.
      q.break_parent if parenthesized || B4umRubyFormatting.multiline_list?(parts) ||
        B4umRubyFormatting.multiline_call_options?(call, parts)
      super
    end
  end

  module KeywordArguments
    def format(q)
      q.break_parent if B4umRubyFormatting.multiline_list?(assocs)
      super
    end
  end

  module Commands
    private

    def align(q, node, &block)
      arguments = node.arguments
      keywords = arguments.parts.first if arguments.is_a?(SyntaxTree::Args) && arguments.parts.one?
      value = keywords.assocs.first.value if keywords.is_a?(SyntaxTree::BareAssocHash) &&
        keywords.assocs.one? && keywords.assocs.first.is_a?(SyntaxTree::Assoc)

      # Ein Array oder Hash hinter einem einzelnen Keyword beginnt bereits
      # auf der Aufrufzeile und benötigt keine zusätzliche Argumentausrichtung.
      if value.is_a?(SyntaxTree::ArrayLiteral) || value.is_a?(SyntaxTree::HashLiteral)
        q.text(" ")
        yield
      else
        super
      end
    end
  end
end

SyntaxTree::Args.prepend(B4umRubyFormatting::Arguments)
SyntaxTree::BareAssocHash.prepend(B4umRubyFormatting::KeywordArguments)
SyntaxTree::Command.prepend(B4umRubyFormatting::Commands)

# Ruby-Code mit Syntax Tree formatieren und die gewünschte Einrückung anwenden.
source = request.fetch("source")
scalar = request.fetch("tabWidth") / 2
formatter = SyntaxTree::Formatter.new(source, [], request.fetch("printWidth"), "\n") do |width|
  " " * width * scalar
end
SyntaxTree.parse(source).format(formatter)
formatter.flush
$stdout.write(formatter.output.join)
